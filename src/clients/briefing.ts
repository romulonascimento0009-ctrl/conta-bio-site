import { z } from "zod";
import { INSTAGRAM_HANDLE, isSafeHref, normalizeInstagram, WHATSAPP_DIGITS } from "@/sites/links";

const optional = (max: number) => z.string().trim().max(max).default("");

/** Briefing coletado com o cliente. Campos livres alimentarão a IA na Fase 4. */
export const briefingSchema = z.object({
  businessName: z.string().trim().min(1, "informe o nome do negócio").max(80),
  professionalName: optional(80),
  specialties: optional(300),
  services: optional(3000),
  audience: optional(500),
  differentials: optional(1000),
  visualPreferences: optional(500),
  avoid: optional(500),
  whatsapp: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine(
      (v) => v === "" || WHATSAPP_DIGITS.test(v),
      "WhatsApp com DDI e DDD, ex.: 55 11 99999-8888",
    )
    .default(""),
  instagram: z
    .string()
    .trim()
    .transform(normalizeInstagram)
    .refine((v) => v === "" || INSTAGRAM_HANDLE.test(v), "perfil do Instagram inválido")
    .default(""),
  bookingUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || isSafeHref(v), "link inválido (use https://...)")
    .default(""),
  addressLine: optional(120),
  city: optional(60),
  hours: optional(300),
  notes: optional(2000),
});

export type Briefing = z.infer<typeof briefingSchema>;

export const BRIEFING_FIELDS: {
  name: keyof Briefing;
  label: string;
  multiline?: boolean;
  hint?: string;
}[] = [
  { name: "businessName", label: "Nome do negócio" },
  { name: "professionalName", label: "Nome da profissional" },
  {
    name: "specialties",
    label: "Especialidades",
    hint: "Ex.: cabelos cacheados, coloração, noivas",
  },
  {
    name: "services",
    label: "Serviços e preços",
    multiline: true,
    hint: "Um por linha: nome — preço",
  },
  { name: "audience", label: "Público", multiline: true },
  { name: "differentials", label: "Diferenciais", multiline: true },
  {
    name: "visualPreferences",
    label: "Preferências visuais",
    multiline: true,
    hint: "Cores, estilo, referências",
  },
  { name: "avoid", label: "O que evitar", multiline: true },
  { name: "whatsapp", label: "WhatsApp", hint: "Com DDI e DDD, ex.: 55 11 99999-8888" },
  { name: "instagram", label: "Instagram", hint: "@perfil" },
  { name: "bookingUrl", label: "Link de agendamento", hint: "https://..." },
  { name: "addressLine", label: "Endereço" },
  { name: "city", label: "Cidade" },
  { name: "hours", label: "Horários de atendimento", multiline: true },
  { name: "notes", label: "Observações", multiline: true },
];
