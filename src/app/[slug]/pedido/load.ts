import { cache } from "react";
import { slugSchema } from "@/clients/slug";
import { getPublishedSiteBySlug } from "@/data/sites";
import { decodeOrder } from "@/sites/catalog";

/**
 * Pedido do catálogo a partir do link "Fotos do pedido" (D49): só itens do catálogo publicado.
 * Nada é guardado no servidor; o link carrega o pedido inteiro.
 */
export const loadOrder = cache(async (slug: string, param: string | undefined) => {
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success || parsed.data !== slug) return null;
  const site = await getPublishedSiteBySlug(slug);
  const block = site?.document.blocks.find((b) => b.type === "catalog" && !b.hidden);
  if (!site || block?.type !== "catalog") return null;
  const lines = decodeOrder(block, param);
  return lines.length ? { site, lines } : null;
});
