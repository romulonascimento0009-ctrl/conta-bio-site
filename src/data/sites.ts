import { eq } from "drizzle-orm";
import type { Briefing } from "@/clients/briefing";
import { db } from "@/db";
import { clients, sites, siteVersions } from "@/db/schema";
import { requireSession } from "@/lib/session";
import {
  collectImageRefs,
  validateSiteDocument,
  type Contact,
  type SiteDocument,
  type ValidationResult,
} from "@/sites/document";
import { createBeautyDocument, type ThemePresetId } from "@/sites/presets";
import { assetsOfClient, type AssetInfo } from "./assets";
import { getBriefing } from "./briefings";
import { getClient } from "./clients";

export type Site = typeof sites.$inferSelect;

export async function getSite(clientId: string): Promise<Site | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  const [row] = await db.select().from(sites).where(eq(sites.clientId, client.id));
  return row ?? null;
}

function contactFromBriefing(name: string, b: Briefing | null): Contact {
  const contact: Contact = { businessName: b?.businessName || name };
  if (b?.whatsapp) contact.whatsapp = b.whatsapp;
  if (b?.instagram) contact.instagram = b.instagram;
  if (b?.bookingUrl) contact.bookingUrl = b.bookingUrl;
  if (b?.addressLine && b.city) contact.address = { line: b.addressLine, city: b.city };
  return contact;
}

export class MissingBookingTarget extends Error {
  constructor() {
    super("Preencha no briefing o WhatsApp ou o link de agendamento antes de criar o site.");
  }
}

/** Cria o rascunho inicial a partir de um tema e dos dados do briefing (sem IA). */
export async function createSiteFromPreset(
  clientId: string,
  presetId: ThemePresetId,
): Promise<Site> {
  await requireSession();
  const client = await getClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  const briefing = await getBriefing(client.id);
  const contact = contactFromBriefing(client.name, briefing);
  if (!contact.whatsapp && !contact.bookingUrl) throw new MissingBookingTarget();

  const doc = createBeautyDocument({ presetId, contact, city: briefing?.city || undefined });
  const result = validateSiteDocument(doc);
  if (!result.ok) throw new Error(`Documento inicial inválido: ${result.issues[0].message}`);

  const [row] = await db
    .insert(sites)
    .values({ clientId: client.id, draft: result.document })
    .onConflictDoNothing({ target: sites.clientId })
    .returning();
  if (!row) throw new Error("Este cliente já tem um site.");
  await db.update(clients).set({ status: "editing" }).where(eq(clients.id, client.id));
  return row;
}

/** Valida o documento e a posse das imagens; salva no rascunho só se tudo estiver válido. */
export async function saveDraft(clientId: string, input: unknown): Promise<ValidationResult> {
  await requireSession();
  const client = await getClient(clientId);
  if (!client) return { ok: false, issues: [{ path: "", message: "Cliente não encontrado." }] };

  const result = validateSiteDocument(input);
  if (!result.ok) return result;

  const refs = collectImageRefs(result.document);
  const owned = await assetsOfClient(
    client.id,
    refs.map((r) => r.assetId),
  );
  const foreign = refs.filter((r) => !owned.has(r.assetId));
  if (foreign.length > 0) {
    return {
      ok: false,
      issues: foreign.map((r) => ({
        path: "",
        message: `imagem não pertence a este cliente: ${r.assetId}`,
      })),
    };
  }

  const updated = await db
    .update(sites)
    .set({ draft: result.document })
    .where(eq(sites.clientId, client.id))
    .returning({ id: sites.id });
  if (updated.length === 0)
    return { ok: false, issues: [{ path: "", message: "Crie o site primeiro." }] };
  return result;
}

export type RenderableSite = { document: SiteDocument; assets: Map<string, AssetInfo> };

async function renderable(clientId: string, raw: unknown): Promise<RenderableSite | null> {
  const parsed = validateSiteDocument(raw);
  if (!parsed.ok) return null;
  const refs = collectImageRefs(parsed.document);
  return {
    document: parsed.document,
    assets: await assetsOfClient(
      clientId,
      refs.map((r) => r.assetId),
    ),
  };
}

/** Rascunho para a prévia do painel (exige sessão). */
export async function getDraftForPreview(clientId: string): Promise<RenderableSite | null> {
  const site = await getSite(clientId);
  return site ? renderable(site.clientId, site.draft) : null;
}

/** Site publicado para o subdomínio público (sem sessão). */
export async function getPublishedSiteBySlug(slug: string): Promise<RenderableSite | null> {
  const [row] = await db
    .select({ clientId: clients.id, document: siteVersions.document })
    .from(clients)
    .innerJoin(sites, eq(sites.clientId, clients.id))
    .innerJoin(siteVersions, eq(siteVersions.id, sites.publishedVersionId))
    .where(eq(clients.slug, slug));
  return row ? renderable(row.clientId, row.document) : null;
}
