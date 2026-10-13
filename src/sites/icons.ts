/**
 * Ícones disponíveis nos cartões. Cada um tem identidade própria (estilo ícone de app):
 * serviços conhecidos usam a cor/marca do serviço; os demais, uma cor fixa.
 * Os desenhos SVG ficam em `render/Icon.tsx`.
 */
export const ICONS = {
  instagram: { label: "Instagram", tile: "brand-instagram" },
  whatsapp: { label: "WhatsApp", tile: "brand-whatsapp" },
  google: { label: "Google", tile: "brand-google" },
  maps: { label: "Localização", tile: "c-maps" },
  phone: { label: "Telefone", tile: "c-phone" },
  menu: { label: "Cardápio", tile: "c-menu" },
  calendar: { label: "Agenda", tile: "c-calendar" },
  tag: { label: "Preços", tile: "c-tag" },
  gift: { label: "Presente / encomenda", tile: "c-gift" },
  shield: { label: "Convênios / garantia", tile: "c-shield" },
  delivery: { label: "Delivery", tile: "c-delivery" },
  link: { label: "Link", tile: "c-link" },
  star: { label: "Estrela", tile: "c-star" },
  heart: { label: "Coração", tile: "c-heart" },
  email: { label: "E-mail", tile: "c-email" },
  facebook: { label: "Facebook", tile: "brand-facebook" },
  tiktok: { label: "TikTok", tile: "brand-tiktok" },
  youtube: { label: "YouTube", tile: "brand-youtube" },
} as const;

export type IconId = keyof typeof ICONS;
export const ICON_IDS = Object.keys(ICONS) as [IconId, ...IconId[]];
