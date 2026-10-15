import { z } from "zod";
import { INSTAGRAM_HANDLE, isSafeHref, normalizeInstagram, WHATSAPP_DIGITS } from "@/sites/links";

const optional = (max: number) => z.string().trim().max(max).default("");

/* Campos reutilizados pelo cadastro do cliente (briefing) e pela edição rápida. Vazio = não informado. */

export const whatsappField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine(
    (v) => v === "" || WHATSAPP_DIGITS.test(v),
    "WhatsApp com DDI e DDD, ex.: 55 11 99999-8888",
  )
  .default("");

export const phoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || /^[0-9]{8,15}$/.test(v), "telefone com DDD, ex.: 11 3333-0000")
  .default("");

export const instagramField = z
  .string()
  .trim()
  .transform((v) =>
    normalizeInstagram(v.replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "")),
  )
  .refine(
    (v) => v === "" || INSTAGRAM_HANDLE.test(v),
    "perfil do Instagram inválido (ex.: @minhaloja)",
  )
  .default("");

export const urlField = z
  .string()
  .trim()
  .refine((v) => v === "" || isSafeHref(v), "link inválido (use https://...)")
  .default("");

/** "Seg a sex | 8h – 18h" por linha → linhas de horário. Linhas vazias são ignoradas. */
export function parseHours(text: string): { days: string; time: string }[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [days, ...rest] = l.split("|");
      return { days: days.trim(), time: rest.join("|").trim() };
    });
}

export const hoursField = optional(600).refine(
  (v) => parseHours(v).every((r) => r.days && r.time && r.days.length <= 40 && r.time.length <= 40),
  'use uma linha por período no formato "Seg a sex | 8h – 18h"',
);

/** Briefing coletado com o cliente. Campos livres alimentarão a IA na Fase 5. */
export const briefingSchema = z.object({
  businessName: z.string().trim().min(1, "informe o nome do negócio").max(60),
  tagline: optional(120),
  categories: optional(150),
  city: optional(40),
  instagram: instagramField,
  whatsapp: whatsappField,
  phone: phoneField,
  googleReviewUrl: urlField,
  address: optional(160),
  mainLinkUrl: urlField,
  wifiNetwork: optional(32),
  wifiPassword: optional(63),
  hours: hoursField,
  services: optional(3000),
  audience: optional(500),
  differentials: optional(1000),
  visualPreferences: optional(500),
  notes: optional(2000),
});

export type Briefing = z.infer<typeof briefingSchema>;

/** Etiquetas do topo do Bio Site: separadas por vírgula, em maiúsculas. */
export function parseCategories(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export const MAX_CATEGORIES = 6;
export const MAX_CATEGORY_LENGTH = 24;

/**
 * Regras extras só ao salvar: cadastros antigos que as violam continuam legíveis
 * (`briefingSchema`) e são corrigidos na próxima edição.
 */
export const briefingInputSchema = briefingSchema.superRefine((b, ctx) => {
  const categories = parseCategories(b.categories);
  if (categories.length > MAX_CATEGORIES) {
    ctx.addIssue({
      code: "custom",
      path: ["categories"],
      message: `use até ${MAX_CATEGORIES} categorias`,
    });
  }
  if (categories.some((c) => c.length > MAX_CATEGORY_LENGTH)) {
    ctx.addIssue({
      code: "custom",
      path: ["categories"],
      message: `cada categoria pode ter até ${MAX_CATEGORY_LENGTH} letras; separe-as por vírgula`,
    });
  }
});

export const BRIEFING_FIELDS: {
  name: keyof Briefing;
  label: string;
  multiline?: boolean;
  hint?: string;
}[] = [
  { name: "businessName", label: "Nome do negócio" },
  {
    name: "tagline",
    label: "Slogan",
    hint: "Frase que aparece logo abaixo do nome da empresa. Ex.: Brinquedos seguros e revisados para o seu parque",
  },
  {
    name: "categories",
    label: "Categorias",
    hint: "Etiquetas curtas abaixo do nome: até 6, separadas por vírgula, com até 24 letras cada. Ex.: Manutenção, Reformas, Laudos",
  },
  { name: "city", label: "Cidade", hint: "Ex.: Campinas/SP" },
  { name: "instagram", label: "Instagram", hint: "@perfil" },
  { name: "whatsapp", label: "WhatsApp", hint: "Com DDI e DDD, ex.: 55 11 99999-8888" },
  { name: "phone", label: "Telefone fixo", hint: "Opcional" },
  {
    name: "googleReviewUrl",
    label: "Link de avaliação no Google",
    hint: "No Perfil da Empresa no Google: “Pedir avaliações” → copiar link",
  },
  { name: "address", label: "Endereço completo" },
  {
    name: "mainLinkUrl",
    label: "Link principal",
    hint: "Cardápio, catálogo ou agenda online (https://...)",
  },
  { name: "wifiNetwork", label: "Wi-Fi: nome da rede", hint: "Opcional" },
  {
    name: "wifiPassword",
    label: "Wi-Fi: senha",
    hint: "Fica visível no Bio Site para os clientes",
  },
  {
    name: "hours",
    label: "Horários",
    multiline: true,
    hint: "Uma linha por período: Seg a sex | 8h – 18h",
  },
  { name: "services", label: "Produtos e serviços", multiline: true },
  { name: "audience", label: "Público", multiline: true },
  { name: "differentials", label: "Diferenciais", multiline: true },
  {
    name: "visualPreferences",
    label: "Preferências visuais",
    multiline: true,
    hint: "Cores, estilo, referências",
  },
  { name: "notes", label: "Observações", multiline: true },
];
