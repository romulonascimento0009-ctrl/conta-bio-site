import { eq } from "drizzle-orm";
import { briefingSchema } from "@/clients/briefing";
import { isSegment } from "@/clients/segments";
import { db } from "@/db";
import { clients, sites, siteVersions } from "@/db/schema";
import { requireOperator } from "@/lib/session";
import {
  collectImageRefs,
  validateBio,
  type BioDocument,
  type ValidationResult,
} from "@/sites/bio";
import { changedParts } from "@/sites/changes";
import { applyQuickEdit, type QuickEdit } from "@/sites/quick-edit";
import { createBioDocument } from "@/sites/templates";
import type { ThemeId } from "@/sites/themes";
import { assetsOfClient, type AssetInfo } from "./assets";
import { recordAudit } from "./audit";
import { getBriefing } from "./briefings";
import { getClient } from "./clients";

export type Site = typeof sites.$inferSelect;

export async function getSite(clientId: string): Promise<Site | null> {
  const client = await getClient(clientId);
  if (!client) return null;
  const [row] = await db.select().from(sites).where(eq(sites.clientId, client.id));
  return row ?? null;
}

/** Rascunho atual já validado (ou null se não houver site ou o documento for de formato antigo). */
export async function getDraft(clientId: string): Promise<BioDocument | null> {
  const site = await getSite(clientId);
  if (!site) return null;
  const parsed = validateBio(site.draft);
  return parsed.ok ? parsed.document : null;
}

/** Cria o rascunho inicial a partir do segmento do cliente, do tema e do briefing (sem IA). */
export async function createSiteFromTemplate(clientId: string, themeId?: ThemeId): Promise<Site> {
  await requireOperator();
  const client = await getClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  const briefing =
    (await getBriefing(client.id)) ?? briefingSchema.parse({ businessName: client.name });
  const segment = isSegment(client.segment) ? client.segment : "other";

  const result = validateBio(createBioDocument({ segment, themeId, briefing }));
  if (!result.ok) throw new Error(`Documento inicial inválido: ${result.issues[0].message}`);

  const [row] = await db
    .insert(sites)
    .values({ clientId: client.id, draft: result.document })
    .onConflictDoNothing({ target: sites.clientId })
    .returning();
  if (!row) throw new Error("Este cliente já tem um Bio Site.");
  await db.update(clients).set({ status: "editing" }).where(eq(clients.id, client.id));
  await recordAudit(client.id, "site.create", { theme: themeId ?? null });
  return row;
}

/**
 * Valida o documento e a posse das imagens; salva no rascunho só se tudo estiver válido.
 * `source` identifica a tela no registro de auditoria.
 */
export async function saveDraft(
  clientId: string,
  input: unknown,
  source = "Editor visual",
): Promise<ValidationResult> {
  const client = await getClient(clientId);
  if (!client) return { ok: false, issues: [{ path: "", message: "Cliente não encontrado." }] };

  const result = validateBio(input);
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

  const [current] = await db
    .select({ draft: sites.draft })
    .from(sites)
    .where(eq(sites.clientId, client.id));
  if (!current) return { ok: false, issues: [{ path: "", message: "Crie o Bio Site primeiro." }] };
  await db.update(sites).set({ draft: result.document }).where(eq(sites.clientId, client.id));
  const parts = changedParts(current.draft, result.document);
  if (parts.length > 0) await recordAudit(client.id, "draft.save", { source, parts });
  return result;
}

/** Edição rápida: aplica os campos ao rascunho atual e salva (validando tudo). */
export async function saveQuickEdit(clientId: string, q: QuickEdit): Promise<ValidationResult> {
  const draft = await getDraft(clientId);
  if (!draft) return { ok: false, issues: [{ path: "", message: "Crie o Bio Site primeiro." }] };
  return saveDraft(clientId, applyQuickEdit(draft, q), "Edição rápida");
}

/** Publica o rascunho atual: grava uma versão imutável e aponta o endereço público para ela. */
export async function publishDraft(clientId: string, note = ""): Promise<{ slug: string } | null> {
  const client = await getClient(clientId);
  const site = client && (await getSite(client.id));
  if (!client || !site) return null;
  const parsed = validateBio(site.draft);
  if (!parsed.ok) return null;

  const [version] = await db
    .insert(siteVersions)
    .values({ siteId: site.id, document: parsed.document, note: note.slice(0, 200) })
    .returning({ id: siteVersions.id });
  await db.update(sites).set({ publishedVersionId: version.id }).where(eq(sites.id, site.id));
  await db.update(clients).set({ status: "published" }).where(eq(clients.id, client.id));
  await recordAudit(client.id, "site.publish", { note: note.slice(0, 200), versionId: version.id });
  return { slug: client.slug };
}

/** O rascunho tem alterações ainda não publicadas? */
export async function hasUnpublishedChanges(site: Site): Promise<boolean> {
  if (!site.publishedVersionId) return true;
  const [v] = await db
    .select({ document: siteVersions.document })
    .from(siteVersions)
    .where(eq(siteVersions.id, site.publishedVersionId));
  return !v || JSON.stringify(v.document) !== JSON.stringify(site.draft);
}

export type RenderableSite = { document: BioDocument; assets: Map<string, AssetInfo> };

async function renderable(clientId: string, raw: unknown): Promise<RenderableSite | null> {
  const parsed = validateBio(raw);
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

/** Rascunho para a prévia (exige acesso ao cliente, via getSite → getClient). */
export async function getDraftForPreview(clientId: string): Promise<RenderableSite | null> {
  const site = await getSite(clientId);
  return site ? renderable(site.clientId, site.draft) : null;
}

/** Bio Site publicado para o endereço público (sem sessão). */
export async function getPublishedSiteBySlug(slug: string): Promise<RenderableSite | null> {
  const [row] = await db
    .select({ clientId: clients.id, document: siteVersions.document })
    .from(clients)
    .innerJoin(sites, eq(sites.clientId, clients.id))
    .innerJoin(siteVersions, eq(siteVersions.id, sites.publishedVersionId))
    .where(eq(clients.slug, slug));
  return row ? renderable(row.clientId, row.document) : null;
}
