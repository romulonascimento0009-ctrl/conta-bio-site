/** Aceita apenas links seguros para sites públicos: https/http, tel:, mailto:. Nunca javascript:/data:. */
export function isSafeHref(value: string): boolean {
  if (/^(tel:\+?[0-9]{8,15}|mailto:[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+)$/.test(value)) return true;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.includes(".");
  } catch {
    return false;
  }
}

/** Número de WhatsApp em formato internacional, só dígitos (ex.: 5511999998888). */
export const WHATSAPP_DIGITS = /^[1-9][0-9]{9,14}$/;

export function whatsappHref(digits: string, message?: string): string {
  const text = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** Convite de grupo do WhatsApp (Reistyle, 2026-10-26): https://chat.whatsapp.com/<código>. */
export const WHATSAPP_GROUP = /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]{10,40}$/;

/** Link de grupo como o usuário colar (sem https, com /invite/ ou ?parâmetros): forma canônica. */
export function parseWhatsappGroup(input: string): string {
  const code = input.trim().match(/chat\.whatsapp\.com\/(?:invite\/)?([A-Za-z0-9]+)/i)?.[1];
  return code ? `https://chat.whatsapp.com/${code}` : input.trim();
}

/**
 * Destino do WhatsApp do cliente: o número (com a mensagem pronta) ou, sem número, o grupo
 * (link de grupo não aceita mensagem). Sem nenhum dos dois, `null`.
 */
export function whatsappTarget(
  c: { whatsapp?: string; whatsappGroup?: string },
  message?: string,
): string | null {
  if (c.whatsapp) return whatsappHref(c.whatsapp, message);
  return c.whatsappGroup ?? null;
}

/**
 * WhatsApp como o usuário colar: link (wa.me/…, api.whatsapp.com/send?phone=…) ou número em
 * qualquer formato. Devolve só os dígitos; número brasileiro sem DDI (10 ou 11 dígitos, com ou
 * sem 0 na frente) ganha o 55. O resultado pode ser inválido — quem chama confere `WHATSAPP_DIGITS`.
 */
export function parseWhatsapp(input: string): string {
  const v = input.trim();
  const fromLink =
    v.match(/wa\.me\/\+?(\d+)/i)?.[1] ?? v.match(/whatsapp\.com\/.*[?&]phone=\+?(\d+)/i)?.[1];
  const digits = (fromLink ?? v.replace(/\D/g, "")).replace(/^0+/, "");
  return digits.length === 10 || digits.length === 11 ? `55${digits}` : digits;
}

/** Perfil de rede (Instagram, TikTok): aceita "@perfil", "perfil" ou o link; devolve só o perfil. */
function parseProfile(input: string, host: RegExp): string {
  const v = input.trim();
  const path = v.match(host)?.[1];
  return (path ?? v).split(/[/?#]/)[0].replace(/^@/, "");
}

export function normalizeInstagram(input: string): string {
  return parseProfile(input, /instagram\.com\/(.*)$/i);
}

export function normalizeTiktok(input: string): string {
  return parseProfile(input, /tiktok\.com\/(.*)$/i);
}

/** Link colado sem "https://" (ex.: g.page/r/abc) ganha o prefixo; o resto fica como veio. */
export function withScheme(input: string): string {
  const v = input.trim();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|\?|$)/i.test(v) ? `https://${v}` : v;
}

export const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;

/** Texto que é um link (ex.: colado no subtítulo por engano): nunca é mostrado como texto no cartão. */
export function looksLikeLink(text: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(text.trim());
}

/** Subtítulo exibido no cartão: o escrito pelo usuário, ou o automático se ele estiver vazio ou for um link. */
export function cardSubtitle(own: string | undefined, auto?: string): string | undefined {
  return own && !looksLikeLink(own) ? own : auto;
}
