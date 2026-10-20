import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { isSegment } from "@/clients/segments";
import { db } from "@/db";
import { aiUsage, assets } from "@/db/schema";
import { AiUnavailable, callClaude, type AiCall } from "@/ai/client";
import { allowedUrlsOf, applyAiEdits, type AiResult } from "@/ai/edits";
import { costMicros, withinBudget, worstCaseMicros } from "@/ai/pricing";
import { userPrompt } from "@/ai/prompt";
import { env } from "@/lib/env";
import { requireOperator } from "@/lib/session";
import { storage } from "@/lib/storage";
import { validateBio } from "@/sites/bio";
import { variantKey } from "./assets";
import { recordAudit } from "./audit";
import { getBriefing } from "./briefings";
import { getClient } from "./clients";

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

/** Gasto com IA no mês corrente (UTC), somando todos os clientes, em milionésimos de dólar. */
export async function aiSpentThisMonth(): Promise<number> {
  await requireOperator();
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${aiUsage.costMicros}), 0)::int` })
    .from(aiUsage)
    .where(gte(aiUsage.createdAt, monthStart()));
  return Number(row?.total ?? 0);
}

export type AiEditResult =
  ({ ok: true; costMicros: number } & AiResult) | { ok: false; message: string };

/**
 * Pede à IA alterações sobre o documento que está no editor (não salva nada: o operador vê a
 * prévia e decide). Só o operador usa a IA. Confere o teto mensal antes de chamar e registra o
 * custo depois, inclusive quando a resposta é recusada ou incompleta.
 */
export async function requestAiEdit(
  clientId: string,
  mode: "generate" | "request",
  input: unknown,
  request = "",
): Promise<AiEditResult> {
  const op = await requireOperator();
  const client = await getClient(clientId);
  if (!client) return { ok: false, message: "Cliente não encontrado." };
  const parsed = validateBio(input);
  if (!parsed.ok)
    return { ok: false, message: "Corrija as pendências do editor antes de pedir à IA." };
  const text = request.trim().slice(0, 1000);
  if (mode === "request" && !text) return { ok: false, message: "Escreva o que você quer mudar." };

  const doc = parsed.document;
  const briefing = await getBriefing(client.id);
  const allowed = allowedUrlsOf(doc, [briefing?.mainLinkUrl]);
  const logo =
    mode === "generate" ? await logoImage(client.id, doc.profile.logo?.assetId) : undefined;
  const prompt = userPrompt({
    mode,
    request: text,
    segment: isSegment(client.segment) ? client.segment : "other",
    briefing,
    doc,
    allowedUrls: [...allowed],
    hasLogo: !!logo,
  });

  // Teto: estimativa grosseira da entrada (4 caracteres por token, imagem ~1.600 tokens).
  const estimatedInput = Math.ceil(prompt.length / 4) + 3_000 + (logo ? 1_600 : 0);
  if (
    !withinBudget(
      await aiSpentThisMonth(),
      env().AI_MONTHLY_BUDGET_USD,
      worstCaseMicros(estimatedInput),
    )
  )
    return {
      ok: false,
      message: `Teto mensal de IA atingido (US$ ${env().AI_MONTHLY_BUDGET_USD}). Aumente AI_MONTHLY_BUDGET_USD ou espere o próximo mês.`,
    };

  let call: AiCall;
  try {
    call = await callClaude(prompt, logo);
  } catch (err) {
    if (!(err instanceof AiUnavailable)) throw err;
    const partial = err as AiUnavailable & Partial<Pick<AiCall, "tokens" | "model">>;
    if (partial.tokens && partial.model)
      await recordUsage(client.id, op.userId, mode, partial.model, partial.tokens);
    return { ok: false, message: err.message };
  }

  const cost = await recordUsage(client.id, op.userId, mode, call.model, call.tokens);
  const result = applyAiEdits(doc, call.edit, allowed);
  await recordAudit(client.id, "ai.request", {
    mode,
    ...(text && { request: text.slice(0, 200) }),
    model: call.model,
    costUsd: cost / 1_000_000,
    applied: result.applied.length,
    skipped: result.skipped.length,
  });
  return { ok: true, costMicros: cost, ...result };
}

async function recordUsage(
  clientId: string,
  userId: string,
  kind: "generate" | "request",
  model: string,
  t: AiCall["tokens"],
): Promise<number> {
  const cost = costMicros(model, t);
  await db.insert(aiUsage).values({
    clientId,
    userId,
    kind,
    model,
    inputTokens: t.input,
    outputTokens: t.output,
    cacheReadTokens: t.cacheRead,
    cacheWriteTokens: t.cacheWrite,
    costMicros: cost,
  });
  return cost;
}

/** Logo do cliente (variante pequena, WebP) para a IA escolher cores que combinem. */
async function logoImage(clientId: string, assetId: string | undefined) {
  if (!assetId) return undefined;
  const [a] = await db
    .select({ id: assets.id, variants: assets.variants })
    .from(assets)
    .where(and(eq(assets.clientId, clientId), inArray(assets.id, [assetId])));
  if (!a) return undefined;
  const width = a.variants.find((w) => w >= 480) ?? a.variants.at(-1);
  if (!width) return undefined;
  const bytes = await storage().get(variantKey(clientId, a.id, width));
  return bytes
    ? { data: Buffer.from(bytes).toString("base64"), mediaType: "image/webp" as const }
    : undefined;
}
