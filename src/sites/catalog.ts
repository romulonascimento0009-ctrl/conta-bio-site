import type { BlockOf, CatalogCategory } from "./bio";

/**
 * Utilitários do catálogo com carrinho (bloco "catalog", D48): preço digitado no editor ↔ centavos,
 * ids curtos para categorias e produtos novos e o pedido codificado no link "Fotos do pedido".
 */

/** "29,90", "R$ 29,9", "1.299,00", "45" → centavos; vazio → undefined; inválido → null. */
export function parsePrice(text: string): number | undefined | null {
  const t = text.replace(/R\$|\s/gi, "");
  if (!t) return undefined;
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return null;
  const [int, dec = ""] = t.replace(/\./g, "").split(",");
  const cents = Number(int) * 100 + Number(dec.padEnd(2, "0"));
  return cents <= 10_000_000 ? cents : null;
}

/** Centavos → "29,90" (para o campo do editor; sem o "R$"). */
export function formatPrice(cents: number | undefined): string {
  if (cents === undefined) return "";
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

/**
 * Pedido dentro do link "Fotos do pedido" (nada fica guardado no servidor): "c1.p1.2_c5.p1.1" =
 * categoria.produto.quantidade, itens separados por "_" (ids só têm letras, números e hífen).
 */
export const MAX_ORDER_LINES = 50;
export type OrderLine = {
  cat: CatalogCategory;
  prod: CatalogCategory["products"][number];
  qty: number;
};

export function encodeOrder(items: { cat: string; prod: string; qty: number }[]): string {
  return items.map((i) => `${i.cat}.${i.prod}.${i.qty}`).join("_");
}

/** Lê o link: só itens que existem no catálogo publicado, quantidade de 1 a 99, sem repetir. */
export function decodeOrder(block: BlockOf<"catalog">, param: string | undefined): OrderLine[] {
  if (!param || param.length > 2000) return [];
  const lines: OrderLine[] = [];
  const seen = new Set<string>();
  for (const part of param.split("_").slice(0, MAX_ORDER_LINES)) {
    const m = /^([a-z0-9-]{1,20})\.([a-z0-9-]{1,20})\.(\d{1,2})$/.exec(part);
    if (!m) continue;
    const qty = Number(m[3]);
    const cat = block.categories.find((c) => c.id === m[1]);
    const prod = cat?.products.find((p) => p.id === m[2]);
    const key = `${m[1]}.${m[2]}`;
    if (!cat || !prod || qty < 1 || seen.has(key)) continue;
    seen.add(key);
    lines.push({ cat, prod, qty });
  }
  return lines;
}

/** Total em centavos, ou `null` se algum item não tiver preço (o total não aparece). */
export function orderTotal(lines: { prod: { priceCents?: number }; qty: number }[]): number | null {
  if (lines.some((l) => l.prod.priceCents === undefined)) return null;
  return lines.reduce((s, l) => s + l.prod.priceCents! * l.qty, 0);
}

/** Próximo id livre com o prefixo (ex.: "c3", "p11"). */
export function nextItemId(taken: string[], prefix: "c" | "p" | "m" | "q"): string {
  const used = new Set(taken);
  for (let n = 1; ; n++) if (!used.has(`${prefix}${n}`)) return `${prefix}${n}`;
}
