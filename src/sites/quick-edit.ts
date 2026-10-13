import { z } from "zod";
import {
  hoursField,
  instagramField,
  parseHours,
  phoneField,
  urlField,
  whatsappField,
} from "@/clients/briefing";
import type { BioDocument, BlockOf, Contact } from "./bio";
import { HEX_COLOR } from "./color";

/**
 * Edição rápida: os dados que mais mudam no dia a dia, num formulário simples.
 * Aplicada de forma determinística sobre o documento (sem IA), depois validada pelo schema.
 */
export const quickEditSchema = z.object({
  instagram: instagramField,
  whatsapp: whatsappField,
  phone: phoneField,
  googleReviewUrl: urlField,
  googleRating: z
    .string()
    .trim()
    .transform((v) => v.replace(",", "."))
    .refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 5), "nota de 1 a 5, ex.: 4,8")
    .default(""),
  googleReviewCount: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{1,7}$/.test(v), "número inteiro, ex.: 312")
    .default(""),
  address: z.string().trim().max(160).default(""),
  mapsUrl: urlField,
  wifiNetwork: z.string().trim().max(32).default(""),
  wifiPassword: z.string().max(63).default(""),
  hours: hoursField,
  tickerEnabled: z.boolean().default(false),
  tickerItems: z
    .string()
    .default("")
    .refine(
      (v) =>
        v
          .split(/\r?\n/)
          .filter((l) => l.trim())
          .every((l) => l.trim().length <= 60),
      "cada frase pode ter até 60 caracteres",
    ),
  tickerCustomColors: z.boolean().default(false),
  tickerBg: z.string().regex(HEX_COLOR).default("#000000"),
  tickerFg: z.string().regex(HEX_COLOR).default("#ffffff"),
});

export type QuickEdit = z.infer<typeof quickEditSchema>;
export type QuickEditInput = z.input<typeof quickEditSchema>;

/** Valores atuais do documento para preencher o formulário. */
export function quickValuesFrom(doc: BioDocument): QuickEdit {
  const c = doc.contact;
  const wifi = doc.blocks.find((b): b is BlockOf<"wifi"> => b.type === "wifi");
  const hours = doc.blocks.find((b): b is BlockOf<"hours"> => b.type === "hours");
  return {
    instagram: c.instagram ?? "",
    whatsapp: c.whatsapp ?? "",
    phone: c.phone ?? "",
    googleReviewUrl: c.googleReviewUrl ?? "",
    googleRating: c.googleRating !== undefined ? String(c.googleRating) : "",
    googleReviewCount: c.googleReviewCount !== undefined ? String(c.googleReviewCount) : "",
    address: c.address ?? "",
    mapsUrl: c.mapsUrl ?? "",
    wifiNetwork: wifi?.network ?? "",
    wifiPassword: wifi?.password ?? "",
    hours: hours ? hours.rows.map((r) => `${r.days} | ${r.time}`).join("\n") : "",
    tickerEnabled: doc.ticker.enabled,
    tickerItems: doc.ticker.items.join("\n"),
    tickerCustomColors: !!doc.ticker.colors,
    tickerBg: doc.ticker.colors?.bg ?? doc.tickerTheme.bg,
    tickerFg: doc.ticker.colors?.fg ?? doc.tickerTheme.fg,
  };
}

const opt = <T>(v: T | "" | undefined): T | undefined =>
  v === "" || v === undefined ? undefined : v;

/** Novo documento com as alterações aplicadas (o original não é modificado). */
export function applyQuickEdit(doc: BioDocument, q: QuickEdit): BioDocument {
  const next = structuredClone(doc);

  const contact: Contact = { ...next.contact };
  contact.instagram = opt(q.instagram);
  contact.whatsapp = opt(q.whatsapp);
  contact.phone = opt(q.phone);
  contact.googleReviewUrl = opt(q.googleReviewUrl);
  contact.googleRating = q.googleRating === "" ? undefined : Number(q.googleRating);
  contact.googleReviewCount = q.googleReviewCount === "" ? undefined : Number(q.googleReviewCount);
  contact.address = opt(q.address);
  contact.mapsUrl = opt(q.mapsUrl);
  next.contact = Object.fromEntries(
    Object.entries(contact).filter(([, v]) => v !== undefined),
  ) as Contact;

  // Wi-Fi: cria, atualiza ou remove o bloco conforme o nome da rede.
  const wifiIndex = next.blocks.findIndex((b) => b.type === "wifi");
  if (q.wifiNetwork) {
    const wifi: BlockOf<"wifi"> = {
      ...(wifiIndex >= 0
        ? (next.blocks[wifiIndex] as BlockOf<"wifi">)
        : {
            id: "wifi",
            type: "wifi",
            hidden: false,
            title: "Wi-Fi",
            showQr: true,
            security: "WPA",
          }),
      network: q.wifiNetwork,
      password: q.wifiPassword,
      security: q.wifiPassword ? "WPA" : "nopass",
    } as BlockOf<"wifi">;
    if (wifiIndex >= 0) next.blocks[wifiIndex] = wifi;
    else next.blocks.splice(insertBeforeMaps(next), 0, wifi);
  } else if (wifiIndex >= 0) {
    next.blocks.splice(wifiIndex, 1);
  }

  // Horários: idem.
  const rows = parseHours(q.hours);
  const hoursIndex = next.blocks.findIndex((b) => b.type === "hours");
  if (rows.length) {
    if (hoursIndex >= 0) (next.blocks[hoursIndex] as BlockOf<"hours">).rows = rows;
    else
      next.blocks.splice(insertBeforeMaps(next), 0, {
        id: "horarios",
        type: "hours",
        hidden: false,
        title: "Horários",
        rows,
      });
  } else if (hoursIndex >= 0) {
    next.blocks.splice(hoursIndex, 1);
  }

  next.ticker = {
    enabled: q.tickerEnabled,
    items: q.tickerItems
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean),
    ...(q.tickerCustomColors ? { colors: { bg: q.tickerBg, fg: q.tickerFg } } : {}),
  };
  return next;
}

/** Novos blocos entram antes do cartão de localização (que fica por último). */
function insertBeforeMaps(doc: BioDocument): number {
  const i = doc.blocks.findIndex((b) => b.type === "link" && b.action === "maps");
  return i >= 0 ? i : doc.blocks.length;
}
