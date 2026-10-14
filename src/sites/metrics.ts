import { createHmac } from "node:crypto";
import { z } from "zod";
import { resolveLink, type BioDocument } from "./bio";

/** Origens de visita, na ordem exibida no painel. */
export const SOURCES = {
  qr: "QR code",
  nfc: "NFC",
  instagram: "Instagram",
  google: "Google",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  tiktok: "TikTok",
  outro: "Outros sites",
  direto: "Direto",
} as const;
export type Source = keyof typeof SOURCES;

/** Parâmetro dos links impressos/gravados: `?o=qr` (QR code) e `?o=nfc` (etiqueta NFC). */
export const SOURCE_PARAM = "o";
export const TAGGED_SOURCES = ["qr", "nfc"] as const;

const REFERRER_HOSTS: [RegExp, Source][] = [
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)google\.[a-z.]+$/, "google"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "facebook"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "whatsapp"],
  [/(^|\.)tiktok\.com$/, "tiktok"],
];

/**
 * Origem da visita: o parâmetro `o` (QR/NFC) vence; senão, o site que trouxe a pessoa
 * (só o domínio é usado — nada do endereço completo é guardado). Sem referência = direto.
 */
export function visitSource(
  param: string | undefined,
  referrer: string | undefined,
  ownHost: string,
): Source {
  if (param && (TAGGED_SOURCES as readonly string[]).includes(param)) return param as Source;
  if (!referrer) return "direto";
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return "direto";
  }
  if (host === ownHost) return "direto";
  return REFERRER_HOSTS.find(([re]) => re.test(host))?.[1] ?? "outro";
}

/** Robôs, pré-visualizações de link e ferramentas de teste não contam. */
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true;
  return /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|discord|headless|lighthouse|curl|wget|python|node-fetch|axios/i.test(
    userAgent,
  );
}

/** Rótulos dos alvos de clique no painel. */
export const TARGET_LABEL: Record<string, string> = {
  instagram: "Instagram",
  google_review: "Google (avaliar)",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  maps: "Mapa / como chegar",
  url: "Link",
  fab: "Botão flutuante do WhatsApp",
  "social:instagram": "Rodapé: Instagram",
  "social:facebook": "Rodapé: Facebook",
  "social:tiktok": "Rodapé: TikTok",
  "social:youtube": "Rodapé: YouTube",
  "social:phone": "Rodapé: Telefone",
  "social:email": "Rodapé: E-mail",
  "social:google": "Rodapé: Google",
};

/**
 * Cliques aceitos para este documento, por chave enviada pelo navegador (`data-track`).
 * O servidor só grava chaves desta lista: o navegador não escolhe o que é registrado.
 */
export function trackTargets(doc: BioDocument): Map<string, { target: string; label: string }> {
  const map = new Map<string, { target: string; label: string }>();
  for (const b of doc.blocks) {
    if (b.type !== "link" || b.hidden || !resolveLink(b, doc.contact)) continue;
    map.set(`b:${b.id}`, { target: b.action, label: b.title });
  }
  for (const icon of ["instagram", "google", "facebook", "tiktok", "youtube", "phone", "email"]) {
    map.set(`s:${icon}`, { target: `social:${icon}`, label: TARGET_LABEL[`social:${icon}`] });
  }
  if (doc.floatingWhatsapp && doc.contact.whatsapp) {
    map.set("fab", { target: "fab", label: TARGET_LABEL.fab });
  }
  return map;
}

/** Corpo enviado pelo navegador (sendBeacon). */
export const eventInputSchema = z.object({
  t: z.enum(["v", "c"]),
  s: z.string().max(40),
  o: z.string().max(10).optional(),
  r: z.string().max(500).optional(),
  k: z.string().max(60).optional(),
});

/**
 * Identificador de visitante que muda todo dia: HMAC(segredo, dia + IP + navegador), cortado.
 * Permite contar visitantes únicos por dia sem guardar IP nem usar cookies.
 */
export function dailyVisitor(secret: string, day: string, ip: string, userAgent: string): string {
  return createHmac("sha256", secret)
    .update(`${day}|${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 16);
}
