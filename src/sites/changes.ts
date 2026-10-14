import type { BioDocument } from "./bio";

/** Partes do Bio Site, com o nome usado no editor (para o registro de auditoria). */
const PARTS: [keys: (keyof BioDocument)[], label: string][] = [
  [["profile"], "Topo"],
  [["contact"], "Contato"],
  [["blocks"], "Blocos"],
  [["ticker", "tickerTheme"], "Faixa"],
  [["theme"], "Aparência"],
  [["meta"], "SEO"],
  [["floatingWhatsapp"], "WhatsApp flutuante"],
];

/** Quais partes mudaram entre dois documentos (o anterior pode ser inválido ou ausente). */
export function changedParts(prev: unknown, next: BioDocument): string[] {
  const before = (prev && typeof prev === "object" ? prev : {}) as Record<string, unknown>;
  return PARTS.filter(([keys]) =>
    keys.some((k) => JSON.stringify(before[k]) !== JSON.stringify(next[k])),
  ).map(([, label]) => label);
}
