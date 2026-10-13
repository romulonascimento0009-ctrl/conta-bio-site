import { CURRENT_SCHEMA_VERSION, type Contact, type SiteDocument, type Theme } from "./document";

/** Temas iniciais do segmento beleza (ver docs/DESIGN.md). */
export const THEME_PRESETS = {
  atelie: {
    label: "Ateliê",
    theme: {
      colors: {
        background: "#F7F5F2",
        surface: "#ECE7E1",
        text: "#1E1B18",
        muted: "#5E5750",
        primary: "#4A2F3A",
        onPrimary: "#FFFFFF",
      },
      fonts: { heading: "eb-garamond", body: "manrope" },
      radius: "none",
    },
  },
  "rosa-forte": {
    label: "Rosa Forte",
    theme: {
      colors: {
        background: "#FFF7F9",
        surface: "#FFE4EC",
        text: "#2A1020",
        muted: "#6B4558",
        primary: "#C2185B",
        onPrimary: "#FFFFFF",
      },
      fonts: { heading: "bricolage-grotesque", body: "bricolage-grotesque" },
      radius: "round",
    },
  },
  "verde-calmo": {
    label: "Verde Calmo",
    theme: {
      colors: {
        background: "#F3F6F2",
        surface: "#E2EAE0",
        text: "#18241C",
        muted: "#4D5E52",
        primary: "#2F5D46",
        onPrimary: "#FFFFFF",
      },
      fonts: { heading: "fraunces", body: "work-sans" },
      radius: "soft",
    },
  },
} as const satisfies Record<string, { label: string; theme: Theme }>;

export type ThemePresetId = keyof typeof THEME_PRESETS;

/**
 * Documento inicial do segmento beleza, montado de forma determinística a partir dos dados
 * básicos do cliente. Textos genéricos marcados para revisão (a IA os substituirá na Fase 4).
 */
export function createBeautyDocument(input: {
  presetId: ThemePresetId;
  contact: Contact;
  city?: string;
}): SiteDocument {
  const { businessName } = input.contact;
  const where = input.city ? ` em ${input.city}` : "";
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    meta: {
      title: businessName,
      description: `${businessName}${where}. Conheça os serviços e agende seu horário.`.slice(
        0,
        160,
      ),
    },
    theme: structuredClone(THEME_PRESETS[input.presetId].theme) as Theme,
    contact: input.contact,
    sections: [
      {
        id: "abertura",
        type: "hero",
        variant: "split",
        hidden: false,
        props: {
          heading: businessName,
          subheading: "Escreva aqui uma frase curta sobre o seu trabalho.",
          ctaLabel: "Agendar horário",
        },
      },
      {
        id: "sobre",
        type: "about",
        variant: "text",
        hidden: false,
        props: {
          heading: "Sobre",
          body: "Conte em poucas linhas quem você é, sua experiência e o que torna seu atendimento especial.",
        },
      },
      {
        id: "servicos",
        type: "services",
        variant: "price-list",
        hidden: false,
        props: {
          heading: "Serviços",
          categories: [
            {
              items: [{ name: "Serviço de exemplo", priceFrom: false, priceCents: 5000 }],
            },
          ],
        },
      },
      {
        id: "contato",
        type: "contact",
        variant: "default",
        hidden: false,
        props: { heading: "Onde estamos", hours: [] },
      },
    ],
  };
}
