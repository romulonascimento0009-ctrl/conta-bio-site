import { and, count, countDistinct, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, siteEvents, sites, siteVersions } from "@/db/schema";
import { env } from "@/lib/env";
import { validateBio } from "@/sites/bio";
import {
  dailyVisitor,
  eventInputSchema,
  isBot,
  SOURCES,
  trackTargets,
  visitSource,
  type Source,
} from "@/sites/metrics";
import { getClient } from "./clients";

const TZ = "America/Sao_Paulo";
/** Teto por visitante e minuto: evita que alguém infle as métricas repetindo cliques. */
const MAX_EVENTS_PER_MINUTE = 30;

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ }); // AAAA-MM-DD
/** Constante fixa no texto do SQL: como parâmetro, o GROUP BY não reconhece a mesma expressão. */
const TZ_SQL = sql.raw(`'${TZ}'`);

export type IncomingEvent = {
  body: unknown;
  ip: string;
  userAgent: string | null;
  /** Usuário logado (operador ou cliente) olhando o próprio site: não conta. */
  hasSession: boolean;
};

/**
 * Registra uma visita ou um clique do endereço público (sem sessão). Silencioso: entrada
 * inválida, robô ou alvo desconhecido são simplesmente ignorados.
 */
export async function recordEvent(e: IncomingEvent): Promise<void> {
  if (e.hasSession || isBot(e.userAgent)) return;
  const parsed = eventInputSchema.safeParse(e.body);
  if (!parsed.success) return;
  const input = parsed.data;

  const [row] = await db
    .select({ clientId: clients.id, document: siteVersions.document })
    .from(clients)
    .innerJoin(sites, eq(sites.clientId, clients.id))
    .innerJoin(siteVersions, eq(siteVersions.id, sites.publishedVersionId))
    .where(eq(clients.slug, input.s));
  if (!row) return;

  const ownHost = new URL(env().PUBLIC_URL).hostname;
  const source = visitSource(input.o, input.r || undefined, ownHost);
  const visitor = dailyVisitor(
    env().BETTER_AUTH_SECRET,
    dayFmt.format(new Date()),
    e.ip,
    e.userAgent ?? "",
  );

  const [{ recent }] = await db
    .select({ recent: count() })
    .from(siteEvents)
    .where(
      and(
        eq(siteEvents.clientId, row.clientId),
        eq(siteEvents.visitor, visitor),
        gte(siteEvents.createdAt, sql`now() - interval '1 minute'`),
      ),
    );
  if (recent >= MAX_EVENTS_PER_MINUTE) return;

  if (input.t === "v") {
    await db.insert(siteEvents).values({ clientId: row.clientId, type: "visit", source, visitor });
    return;
  }
  const doc = validateBio(row.document);
  const target = doc.ok && input.k ? trackTargets(doc.document).get(input.k) : undefined;
  if (!target) return;
  await db.insert(siteEvents).values({
    clientId: row.clientId,
    type: "click",
    source,
    target: target.target,
    label: target.label,
    visitor,
  });
}

export const PERIODS = [7, 30, 90] as const;
export type Period = (typeof PERIODS)[number];

export type Metrics = {
  days: Period;
  visits: number;
  visitors: number;
  clicks: number;
  perDay: { day: string; visits: number }[];
  bySource: { source: Source; label: string; visits: number }[];
  byTarget: { target: string; label: string; clicks: number }[];
};

/** Resumo do período (operador: qualquer cliente; cliente: só o próprio). */
export async function getMetrics(clientId: string, days: Period): Promise<Metrics | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  const since = sql`date_trunc('day', now() AT TIME ZONE ${TZ_SQL}) - make_interval(days => ${days - 1})`;
  const inRange = and(
    eq(siteEvents.clientId, client.id),
    gte(sql`${siteEvents.createdAt} AT TIME ZONE ${TZ_SQL}`, since),
  );
  const day = sql<string>`to_char(${siteEvents.createdAt} AT TIME ZONE ${TZ_SQL}, 'YYYY-MM-DD')`;
  const isVisit = and(inRange, eq(siteEvents.type, "visit"));

  const [[totals], [clickTotal], perDayRows, sourceRows, targetRows] = await Promise.all([
    db
      .select({
        visits: count(),
        visitors: countDistinct(sql`${day} || ${siteEvents.visitor}`),
      })
      .from(siteEvents)
      .where(isVisit),
    db
      .select({ clicks: count() })
      .from(siteEvents)
      .where(and(inRange, eq(siteEvents.type, "click"))),
    db.select({ day, visits: count() }).from(siteEvents).where(isVisit).groupBy(day),
    db
      .select({ source: siteEvents.source, visits: count() })
      .from(siteEvents)
      .where(isVisit)
      .groupBy(siteEvents.source),
    db
      .select({ target: siteEvents.target, label: siteEvents.label, clicks: count() })
      .from(siteEvents)
      .where(and(inRange, eq(siteEvents.type, "click")))
      .groupBy(siteEvents.target, siteEvents.label)
      .orderBy(desc(count())),
  ]);

  // Todos os dias do período, inclusive os sem visita (o gráfico não pode pular dias).
  const byDay = new Map(perDayRows.map((r) => [r.day, r.visits]));
  const today = new Date();
  const perDay = Array.from({ length: days }, (_, i) => {
    const d = dayFmt.format(new Date(today.getTime() - (days - 1 - i) * 86_400_000));
    return { day: d, visits: byDay.get(d) ?? 0 };
  });

  const bySourceMap = new Map(sourceRows.map((r) => [r.source, r.visits]));
  const bySource = (Object.keys(SOURCES) as Source[])
    .map((source) => ({ source, label: SOURCES[source], visits: bySourceMap.get(source) ?? 0 }))
    // QR e NFC sempre aparecem (mesmo zerados): são o que o cliente imprime e grava.
    .filter((s) => s.visits > 0 || s.source === "qr" || s.source === "nfc");

  return {
    days,
    visits: totals.visits,
    visitors: totals.visitors,
    clicks: clickTotal.clicks,
    perDay,
    bySource,
    byTarget: targetRows.map((r) => ({
      target: r.target ?? "",
      label: r.label ?? "",
      clicks: r.clicks,
    })),
  };
}
