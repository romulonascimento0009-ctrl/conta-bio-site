import { z } from "zod";
import { contrastRatio, HEX_COLOR } from "./color";
import { FONT_IDS } from "./fonts";
import { INSTAGRAM_HANDLE, isSafeHref, WHATSAPP_DIGITS, whatsappHref } from "./links";
import { anySection, imageRef, type ImageRef } from "./sections";

export const CURRENT_SCHEMA_VERSION = 1;

const hex = z.string().regex(HEX_COLOR, "cor no formato #rrggbb");
const safeUrl = z.string().trim().max(500).refine(isSafeHref, "link inválido ou inseguro");

/** Mínimo WCAG AA para texto normal. */
export const MIN_CONTRAST = 4.5;

const CONTRAST_PAIRS = [
  ["text", "background"],
  ["text", "surface"],
  ["muted", "background"],
  ["onPrimary", "primary"],
  ["primary", "background"],
] as const;

export const themeSchema = z
  .object({
    colors: z.object({
      background: hex,
      surface: hex,
      text: hex,
      muted: hex,
      primary: hex,
      onPrimary: hex,
    }),
    fonts: z.object({ heading: z.enum(FONT_IDS), body: z.enum(FONT_IDS) }),
    radius: z.enum(["none", "soft", "round"]),
  })
  .superRefine((theme, ctx) => {
    for (const [fg, bg] of CONTRAST_PAIRS) {
      const ratio = contrastRatio(theme.colors[fg], theme.colors[bg]);
      if (ratio < MIN_CONTRAST) {
        ctx.addIssue({
          code: "custom",
          path: ["colors", fg],
          message: `contraste ${fg}/${bg} é ${ratio.toFixed(2)}; mínimo ${MIN_CONTRAST}`,
        });
      }
    }
  });
export type Theme = z.infer<typeof themeSchema>;

export const contactSchema = z.object({
  businessName: z.string().trim().min(1).max(80),
  logo: imageRef.optional(),
  whatsapp: z
    .string()
    .regex(WHATSAPP_DIGITS, "WhatsApp: só dígitos com DDI, ex. 5511999998888")
    .optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.email().optional(),
  bookingUrl: safeUrl.optional(),
  instagram: z.string().regex(INSTAGRAM_HANDLE, "Instagram: só o nome do perfil").optional(),
  tiktok: z.string().regex(INSTAGRAM_HANDLE, "TikTok: só o nome do perfil").optional(),
  facebookUrl: safeUrl.optional(),
  address: z
    .object({
      line: z.string().trim().min(1).max(120),
      city: z.string().trim().min(1).max(60),
      mapUrl: safeUrl.optional(),
    })
    .optional(),
});
export type Contact = z.infer<typeof contactSchema>;

export const siteDocumentSchema = z
  .object({
    schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
    meta: z.object({
      title: z.string().trim().min(1).max(70),
      description: z.string().trim().min(1).max(160),
    }),
    theme: themeSchema,
    contact: contactSchema,
    sections: z.array(anySection).min(1).max(30),
  })
  .superRefine((doc, ctx) => {
    const seen = new Set<string>();
    doc.sections.forEach((s, i) => {
      if (seen.has(s.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["sections", i, "id"],
          message: `id repetido: ${s.id}`,
        });
      }
      seen.add(s.id);
    });
    if (!doc.contact.bookingUrl && !doc.contact.whatsapp) {
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: "informe bookingUrl ou whatsapp (destino do botão Agendar)",
      });
    }
  });

export type SiteDocument = z.infer<typeof siteDocumentSchema>;

export type ValidationResult =
  { ok: true; document: SiteDocument } | { ok: false; issues: { path: string; message: string }[] };

/** Valida um documento vindo de fora (editor, IA, banco). Nunca lança. */
export function validateSiteDocument(input: unknown): ValidationResult {
  const parsed = siteDocumentSchema.safeParse(input);
  if (parsed.success) return { ok: true, document: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

/** Todas as imagens referenciadas pelo documento (para carregar dimensões/variantes). */
export function collectImageRefs(doc: SiteDocument): ImageRef[] {
  const refs: ImageRef[] = [];
  if (doc.contact.logo) refs.push(doc.contact.logo);
  for (const s of doc.sections) {
    if (s.type === "hero" || s.type === "about") {
      if (s.props.image) refs.push(s.props.image);
    } else if (s.type === "gallery") {
      refs.push(...s.props.images);
    }
  }
  return refs;
}

/** Destino do botão "Agendar": link de agendamento, senão WhatsApp. */
export function bookingHref(contact: Contact): string {
  if (contact.bookingUrl) return contact.bookingUrl;
  return whatsappHref(contact.whatsapp ?? "", "Olá! Vi o site e gostaria de agendar um horário.");
}
