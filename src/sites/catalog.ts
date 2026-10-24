/**
 * Utilitários do catálogo com carrinho (bloco "catalog", D48): preço digitado no editor ↔ centavos
 * e ids curtos para categorias e produtos novos.
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

/** Próximo id livre com o prefixo (ex.: "c3", "p11"). */
export function nextItemId(taken: string[], prefix: "c" | "p"): string {
  const used = new Set(taken);
  for (let n = 1; ; n++) if (!used.has(`${prefix}${n}`)) return `${prefix}${n}`;
}
