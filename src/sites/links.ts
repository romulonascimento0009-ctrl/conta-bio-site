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

/** Perfil do Instagram: aceita "@perfil" ou "perfil"; devolve só o identificador. */
export function normalizeInstagram(handle: string): string {
  return handle.trim().replace(/^@/, "");
}

export const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
