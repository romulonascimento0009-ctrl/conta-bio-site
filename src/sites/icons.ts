import { contrastRatio, mixHex, rgbaCss } from "./color";

/**
 * Ícones disponíveis nos cartões. Cada um tem cor própria (estilo ícone de app, com brilho):
 * serviços conhecidos usam a cor da marca; os demais, uma cor escolhida para o desenho branco
 * ter contraste ≥ 3:1 (WCAG 1.4.11). `tile` marca os que têm visual de marca próprio (degradê do
 * Instagram, fundo branco do Google), usado enquanto o cliente não escolhe outra cor.
 * Os desenhos SVG ficam em `render/Icon.tsx`.
 */
export const ICONS = {
  instagram: { label: "Instagram", color: "#d6249f", tile: "brand-instagram" },
  whatsapp: { label: "WhatsApp", color: "#25d366" },
  google: { label: "Google", color: "#1a6fe0", tile: "brand-google" },
  maps: { label: "Localização", color: "#e5372c" },
  phone: { label: "Telefone", color: "#16843d" },
  menu: { label: "Cardápio", color: "#d45d00" },
  calendar: { label: "Agenda", color: "#d93a3a" },
  tag: { label: "Preços", color: "#9b3fd1" },
  gift: { label: "Presente / encomenda", color: "#e0245e" },
  shield: { label: "Convênios / garantia", color: "#5552d6" },
  wheel: { label: "Rodas / oficina", color: "#1e63e0" },
  delivery: { label: "Delivery", color: "#e8392f" },
  link: { label: "Link", color: "#1a6fe0" },
  star: { label: "Estrela", color: "#a86f00" },
  heart: { label: "Coração", color: "#e3285a" },
  email: { label: "E-mail", color: "#1a6fe0" },
  facebook: { label: "Facebook", color: "#1877f2" },
  tiktok: { label: "TikTok", color: "#161823" },
  youtube: { label: "YouTube", color: "#e00000" },
  pix: { label: "Pix", color: "#00897b" },
  quote: { label: "Orçamento (prancheta)", color: "#1a5fd0" },
} as const satisfies Record<string, { label: string; color: string; tile?: string }>;

export type IconId = keyof typeof ICONS;
export const ICON_IDS = Object.keys(ICONS) as [IconId, ...IconId[]];

/** Ícones dos títulos de painel (Wi-Fi, horários, galeria). */
export const SECTION_ICONS = {
  wifi: { color: "#1a6fe0" },
  clock: { color: "#8a3fd6" },
  photos: { color: "#d6336c", tile: "c-photos" },
} as const satisfies Record<string, { color: string; tile?: string }>;
export type SectionIconId = keyof typeof SECTION_ICONS;

/** Marcas cuja cor oficial fica abaixo de 3:1 com o branco; mantidas pelo reconhecimento. */
export const BRAND_COLOR_EXCEPTIONS: readonly IconId[] = ["whatsapp"];

/** Topo do degradê com brilho: a cor clareada. O desenho branco é conferido contra este tom. */
export const glossTop = (color: string) => mixHex(color, "#ffffff", 0.14);

/** Variáveis CSS do ícone com brilho (degradê, sombra colorida). */
export function glossVars(color: string): Record<string, string> {
  const bottom = mixHex(color, "#000000", 0.16);
  return {
    "--ico-top": glossTop(color),
    "--ico-bottom": bottom,
    "--ico-glow": rgbaCss(bottom, 0.55),
  };
}

/** Cor inicial ao ligar "cor própria": a padrão, ou um tom que passa no contraste (WhatsApp). */
export function customIconStart(icon: IconId | SectionIconId): string {
  if (icon in SECTION_ICONS) return SECTION_ICONS[icon as SectionIconId].color;
  return BRAND_COLOR_EXCEPTIONS.includes(icon as IconId) ? "#128c4a" : ICONS[icon as IconId].color;
}

/**
 * Cores do cartão em destaque a partir da cor do ícone: escurece só o necessário para o texto
 * branco ter contraste ≥ 4,5:1; o halo usa a cor viva original.
 */
export function featureColors(color: string): { top: string; bottom: string; glow: string } {
  let alpha = 0.15;
  while (alpha < 0.8 && contrastRatio("#ffffff", mixHex(color, "#000000", alpha)) < 4.5)
    alpha += 0.05;
  return {
    top: mixHex(color, "#000000", alpha),
    bottom: mixHex(color, "#000000", Math.min(alpha + 0.18, 0.9)),
    glow: color,
  };
}
