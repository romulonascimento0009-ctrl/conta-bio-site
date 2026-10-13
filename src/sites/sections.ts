import { z } from "zod";

/** Referência a uma imagem enviada (tabela `assets`) com texto alternativo. */
export const imageRef = z.object({
  assetId: z.uuid(),
  alt: z.string().trim().max(200),
});
export type ImageRef = z.infer<typeof imageRef>;

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).optional();

export const sectionId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,39}$/, "id: letras minúsculas, números e hífen (até 40)");

function section<T extends string, V extends [string, ...string[]], P extends z.ZodType>(
  type: T,
  variants: V,
  props: P,
) {
  return z.object({
    id: sectionId,
    type: z.literal(type),
    variant: z.enum(variants),
    hidden: z.boolean().default(false),
    props,
  });
}

export const heroSection = section(
  "hero",
  ["image-full", "split"],
  z.object({
    heading: text(80),
    subheading: optionalText(200),
    image: imageRef.optional(),
    ctaLabel: text(30).default("Agendar horário"),
  }),
);

export const aboutSection = section(
  "about",
  ["portrait", "text"],
  z.object({
    heading: text(80),
    body: text(1500),
    image: imageRef.optional(),
  }),
);

export const serviceItem = z.object({
  name: text(80),
  description: optionalText(200),
  /** Preço em centavos (BRL). Ausente = "sob consulta". */
  priceCents: z.int().min(0).max(10_000_000).optional(),
  /** Exibe "a partir de". */
  priceFrom: z.boolean().default(false),
  durationMinutes: z.int().min(5).max(720).optional(),
});

export const servicesSection = section(
  "services",
  ["price-list"],
  z.object({
    heading: text(80),
    intro: optionalText(300),
    categories: z
      .array(z.object({ name: optionalText(60), items: z.array(serviceItem).min(1).max(40) }))
      .min(1)
      .max(12),
  }),
);

export const gallerySection = section(
  "gallery",
  ["mosaic", "grid"],
  z.object({
    heading: text(80),
    images: z.array(imageRef).min(1).max(24),
  }),
);

export const testimonialsSection = section(
  "testimonials",
  ["quote"],
  z.object({
    heading: text(80),
    items: z
      .array(z.object({ quote: text(400), author: text(60) }))
      .min(1)
      .max(6),
  }),
);

export const contactSection = section(
  "contact",
  ["default"],
  z.object({
    heading: text(80),
    hours: z
      .array(z.object({ days: text(40), time: text(40) }))
      .max(7)
      .default([]),
  }),
);

export const ctaSection = section(
  "cta",
  ["band"],
  z.object({
    heading: text(80),
    text: optionalText(200),
    ctaLabel: text(30).default("Agendar horário"),
  }),
);

export const anySection = z.discriminatedUnion("type", [
  heroSection,
  aboutSection,
  servicesSection,
  gallerySection,
  testimonialsSection,
  contactSection,
  ctaSection,
]);

export type Section = z.infer<typeof anySection>;
export type SectionType = Section["type"];
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>;

/** Metadados para o painel/editor: nome legível e variantes de cada tipo. */
export const SECTION_INFO: Record<
  SectionType,
  { label: string; variants: Record<string, string> }
> = {
  hero: { label: "Abertura", variants: { "image-full": "Foto inteira", split: "Foto ao lado" } },
  about: { label: "Sobre", variants: { portrait: "Com retrato", text: "Só texto" } },
  services: { label: "Serviços e preços", variants: { "price-list": "Lista de preços" } },
  gallery: { label: "Galeria", variants: { mosaic: "Mosaico", grid: "Grade" } },
  testimonials: { label: "Depoimentos", variants: { quote: "Citação" } },
  contact: { label: "Contato e horários", variants: { default: "Padrão" } },
  cta: { label: "Chamada para agendar", variants: { band: "Faixa" } },
};
