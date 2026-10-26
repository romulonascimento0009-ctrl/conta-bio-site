import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clients, sites, siteVersions } from "@/db/schema";
import { validateBio } from "@/sites/bio";
import { recordAudit } from "./audit";
import { getSite, siteMedia, type RenderableSite } from "./sites";

export type VersionSummary = { id: string; note: string; createdAt: Date; published: boolean };

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export async function listVersions(clientId: string): Promise<VersionSummary[]> {
  const site = await getSite(clientId);
  if (!site) return [];
  const rows = await db
    .select({ id: siteVersions.id, note: siteVersions.note, createdAt: siteVersions.createdAt })
    .from(siteVersions)
    .where(eq(siteVersions.siteId, site.id))
    .orderBy(desc(siteVersions.createdAt));
  return rows.map((r) => ({ ...r, published: r.id === site.publishedVersionId }));
}

async function versionOf(clientId: string, versionId: string) {
  if (!isUuid(versionId)) return null;
  const site = await getSite(clientId);
  if (!site) return null;
  // A versão precisa pertencer ao site deste cliente (isolamento).
  const [v] = await db
    .select()
    .from(siteVersions)
    .where(and(eq(siteVersions.id, versionId), eq(siteVersions.siteId, site.id)));
  return v ? { site, version: v } : null;
}

export async function getVersionForPreview(
  clientId: string,
  versionId: string,
): Promise<RenderableSite | null> {
  const found = await versionOf(clientId, versionId);
  if (!found) return null;
  const parsed = validateBio(found.version.document);
  if (!parsed.ok) return null;
  return {
    document: parsed.document,
    ...(await siteMedia(found.site.clientId, parsed.document)),
  };
}

/**
 * Copia uma versão para o rascunho. Antes, guarda o rascunho atual como versão
 * ("Rascunho guardado antes de restaurar") para que nada se perca.
 */
export async function restoreVersion(clientId: string, versionId: string): Promise<boolean> {
  const found = await versionOf(clientId, versionId);
  if (!found) return false;
  const parsed = validateBio(found.version.document);
  if (!parsed.ok) return false;

  const { site } = found;
  // Só guarda o rascunho se ele ainda não existir em nenhuma versão (evita cópias repetidas).
  const draftJson = JSON.stringify(site.draft);
  const all = await db
    .select({ document: siteVersions.document })
    .from(siteVersions)
    .where(eq(siteVersions.siteId, site.id));
  if (!all.some((v) => JSON.stringify(v.document) === draftJson)) {
    await db.insert(siteVersions).values({
      siteId: site.id,
      document: site.draft,
      note: "Rascunho guardado antes de restaurar",
    });
  }
  await db.update(sites).set({ draft: parsed.document }).where(eq(sites.id, site.id));
  await recordAudit(site.clientId, "version.restore", { versionId, note: found.version.note });
  return true;
}

/** Republica uma versão existente (voltar o endereço público para ela). Não mexe no rascunho. */
export async function publishVersion(clientId: string, versionId: string): Promise<boolean> {
  const found = await versionOf(clientId, versionId);
  if (!found || !validateBio(found.version.document).ok) return false;
  await db
    .update(sites)
    .set({ publishedVersionId: found.version.id })
    .where(eq(sites.id, found.site.id));
  await db.update(clients).set({ status: "published" }).where(eq(clients.id, found.site.clientId));
  await recordAudit(found.site.clientId, "version.publish", {
    versionId,
    note: found.version.note,
  });
  return true;
}
