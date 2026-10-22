/** Conjunto curado de famílias tipográficas disponíveis para os sites (auto-hospedadas). */
export const FONTS = {
  // Cormorant/Cormorant Garamond descartadas: acentos de ê/é/ô mal posicionados (2026-10-13).
  "eb-garamond": { label: "EB Garamond", category: "serif" },
  "playfair-display": { label: "Playfair Display", category: "serif" },
  fraunces: { label: "Fraunces", category: "serif" },
  lora: { label: "Lora", category: "serif" },
  "bricolage-grotesque": { label: "Bricolage Grotesque", category: "sans" },
  manrope: { label: "Manrope", category: "sans" },
  "work-sans": { label: "Work Sans", category: "sans" },
  "dm-sans": { label: "DM Sans", category: "sans" },
  /** Arredondada e alegre (ramos infantis, festas); só para títulos. */
  fredoka: { label: "Fredoka", category: "sans" },
  /** Esportiva e inclinada (oficinas, autopeças, academias); só para títulos, sempre em itálico. */
  "exo-2": { label: "Exo 2 (esportiva)", category: "sans", italic: true },
} as const satisfies Record<string, { label: string; category: string; italic?: boolean }>;

export type FontId = keyof typeof FONTS;

export const FONT_IDS = Object.keys(FONTS) as [FontId, ...FontId[]];

/** Fontes só de título, desenhadas em itálico (não servem para o texto corrido). */
export const isItalicFont = (id: FontId) => "italic" in FONTS[id];
