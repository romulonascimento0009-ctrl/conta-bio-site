import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { assets, sites, siteVersions } from "@/db/schema";
import { requireSession } from "@/lib/session";
import { clientKey, storage } from "@/lib/storage";
import { processImage } from "@/media/process";
import { collectImageRefs, validateSiteDocument } from "@/sites/document";
import { getClient } from "./clients";

export type Asset = typeof assets.$inferSelect;
/** Dados mínimos de uma imagem para renderizar (`srcset`, dimensões). */
export type AssetInfo = Pick<Asset, "id" | "width" | "height" | "variants">;

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export function variantKey(clientId: string, assetId: string, width: number): string {
  return clientKey(clientId, "assets", assetId, `${width}.webp`);
}

export async function listAssets(clientId: string): Promise<Asset[]> {
  const client = await getClient(clientId);
  if (!client) return [];
  return db
    .select()
    .from(assets)
    .where(eq(assets.clientId, client.id))
    .orderBy(desc(assets.createdAt));
}

export async function uploadAsset(clientId: string, file: File, alt = ""): Promise<Asset> {
  await requireSession();
  const client = await getClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");

  const processed = await processImage(Buffer.from(await file.arrayBuffer()));
  const id = crypto.randomUUID();
  const bytes = processed.variants.reduce((sum, v) => sum + v.data.byteLength, 0);

  for (const v of processed.variants) {
    await storage().put(variantKey(client.id, id, v.width), v.data);
  }
  const [row] = await db
    .insert(assets)
    .values({
      id,
      clientId: client.id,
      originalName: file.name.slice(0, 200),
      width: processed.width,
      height: processed.height,
      variants: processed.variants.map((v) => v.width),
      bytes,
      alt: alt.trim().slice(0, 200),
    })
    .returning();
  return row;
}

export async function updateAssetAlt(
  clientId: string,
  assetId: string,
  alt: string,
): Promise<void> {
  await requireSession();
  if (!isUuid(assetId)) return;
  await db
    .update(assets)
    .set({ alt: alt.trim().slice(0, 200) })
    .where(and(eq(assets.id, assetId), eq(assets.clientId, clientId)));
}

export class AssetInUse extends Error {
  constructor() {
    super(
      "Esta imagem está em uso no site (rascunho ou versão publicada). Remova-a do site antes.",
    );
  }
}

/** Exclui a imagem se não estiver referenciada no rascunho nem na versão publicada. */
export async function deleteAsset(clientId: string, assetId: string): Promise<void> {
  await requireSession();
  if (!isUuid(assetId) || !isUuid(clientId)) return;
  const [asset] = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.clientId, clientId)));
  if (!asset) return;

  const [site] = await db.select().from(sites).where(eq(sites.clientId, clientId));
  if (site) {
    const docs: unknown[] = [site.draft];
    if (site.publishedVersionId) {
      const [v] = await db
        .select()
        .from(siteVersions)
        .where(eq(siteVersions.id, site.publishedVersionId));
      if (v) docs.push(v.document);
    }
    for (const raw of docs) {
      const parsed = validateSiteDocument(raw);
      if (parsed.ok && collectImageRefs(parsed.document).some((r) => r.assetId === assetId)) {
        throw new AssetInUse();
      }
    }
  }

  await db.delete(assets).where(eq(assets.id, assetId));
  for (const w of asset.variants) await storage().delete(variantKey(clientId, assetId, w));
}

/** Imagens do cliente com os ids informados (ignora ids de outros clientes). */
export async function assetsOfClient(
  clientId: string,
  ids: string[],
): Promise<Map<string, AssetInfo>> {
  const unique = [...new Set(ids)].filter(isUuid);
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: assets.id,
      width: assets.width,
      height: assets.height,
      variants: assets.variants,
    })
    .from(assets)
    .where(and(eq(assets.clientId, clientId), inArray(assets.id, unique)));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Para a rota pública de mídia: localiza a imagem e confirma que a largura existe. */
export async function findAssetVariant(
  assetId: string,
  width: number,
): Promise<{ clientId: string } | null> {
  if (!isUuid(assetId)) return null;
  const [row] = await db
    .select({ clientId: assets.clientId, variants: assets.variants })
    .from(assets)
    .where(eq(assets.id, assetId));
  if (!row || !row.variants.includes(width)) return null;
  return { clientId: row.clientId };
}
