import {
  MAX_CATEGORIES,
  MAX_CATEGORY_LENGTH,
  parseCategories,
  parseHours,
  type Briefing,
} from "@/clients/briefing";
import { SEGMENTS, type SegmentId } from "@/clients/segments";
import { BIO_SCHEMA_VERSION, type BioDocument, type Block, type Contact } from "./bio";
import { THEMES, type ThemeId } from "./themes";

type Seed = Partial<Briefing> & { businessName: string };

function contactFrom(b: Seed): Contact {
  const c: Contact = {};
  if (b.instagram) c.instagram = b.instagram;
  if (b.whatsapp) c.whatsapp = b.whatsapp;
  if (b.phone) c.phone = b.phone;
  if (b.googleReviewUrl) c.googleReviewUrl = b.googleReviewUrl;
  if (b.address) c.address = b.address;
  return c;
}

/** Cartões e blocos iniciais por segmento. Ordem: Instagram → Google → ações → Wi-Fi → horários → localização. */
function blocksFor(segment: SegmentId, b: Seed): Block[] {
  const link = (
    id: string,
    action: Extract<Block, { type: "link" }>["action"],
    title: string,
    extra: Partial<Extract<Block, { type: "link" }>> = {},
  ): Block => ({ id, type: "link", action, title, hidden: false, variant: "solid", ...extra });

  const main: Record<SegmentId, Block[]> = {
    food: [
      link("whatsapp", "whatsapp", "Fazer pedido no WhatsApp", {
        subtitle: "Retire ou receba em casa",
        badge: "Responde rápido",
      }),
      ...(b.mainLinkUrl
        ? [link("cardapio", "url", "Ver cardápio", { url: b.mainLinkUrl, icon: "menu" })]
        : []),
    ],
    beauty: [
      ...(b.mainLinkUrl
        ? [
            link("agendar", "url", "Agendar horário", {
              url: b.mainLinkUrl,
              icon: "calendar",
              subtitle: "Escolha o serviço e o dia",
            }),
          ]
        : [
            link("agendar", "whatsapp", "Agendar pelo WhatsApp", {
              subtitle: "Escolha o serviço e o dia",
            }),
          ]),
      ...(b.mainLinkUrl
        ? [link("duvidas", "whatsapp", "Tirar dúvidas", { subtitle: "WhatsApp" })]
        : []),
    ],
    health: [
      ...(b.mainLinkUrl
        ? [link("agendar", "url", "Marcar consulta", { url: b.mainLinkUrl, icon: "calendar" })]
        : [link("agendar", "whatsapp", "Marcar consulta", { subtitle: "Pelo WhatsApp" })]),
      link("telefone", "phone", "Ligar para a recepção"),
    ],
    services: [
      link("whatsapp", "whatsapp", "Pedir orçamento", { subtitle: "Pelo WhatsApp" }),
      ...(b.mainLinkUrl
        ? [link("site", "url", "Conheça nosso trabalho", { url: b.mainLinkUrl, icon: "link" })]
        : []),
    ],
    other: [
      link("whatsapp", "whatsapp", "Fale conosco", { subtitle: "Pelo WhatsApp" }),
      ...(b.mainLinkUrl
        ? [link("site", "url", "Saiba mais", { url: b.mainLinkUrl, icon: "link" })]
        : []),
    ],
  };

  const blocks: Block[] = [
    link("instagram", "instagram", "Instagram"),
    link("google", "google_review", "Avaliar no Google"),
    ...main[segment],
  ];
  if (b.wifiNetwork) {
    blocks.push({
      id: "wifi",
      type: "wifi",
      hidden: false,
      title: "Wi-Fi",
      network: b.wifiNetwork,
      password: b.wifiPassword ?? "",
      security: b.wifiPassword ? "WPA" : "nopass",
      showQr: true,
    });
  }
  const rows = b.hours ? parseHours(b.hours) : [];
  if (rows.length)
    blocks.push({ id: "horarios", type: "hours", hidden: false, title: "Horários", rows });
  blocks.push(link("como-chegar", "maps", "Como chegar", { variant: "light" }));
  return blocks;
}

/** Bio Site inicial, montado de forma determinística a partir do briefing (sem IA). */
export function createBioDocument(input: {
  segment: SegmentId;
  themeId?: ThemeId;
  briefing: Seed;
}): BioDocument {
  const { segment, briefing: b } = input;
  const preset = THEMES[input.themeId ?? SEGMENTS[segment].theme];
  // Cadastros salvos antes do limite por categoria podem ter etiquetas longas: corta, não falha.
  const categories = parseCategories(b.categories)
    .slice(0, MAX_CATEGORIES)
    .map((c) => c.slice(0, MAX_CATEGORY_LENGTH).trim());
  const where = b.city ? ` em ${b.city}` : "";

  return {
    schemaVersion: BIO_SCHEMA_VERSION,
    meta: {
      title: b.businessName,
      description: (
        b.tagline || `${b.businessName}${where}. Siga, avalie e fale com a gente.`
      ).slice(0, 160),
    },
    // Bio Sites novos nascem no estilo futurista (pedido do usuário, D38).
    theme: {
      ...structuredClone(preset.theme),
      pattern: SEGMENTS[segment].pattern,
      cardStyle: "glass",
    },
    tickerTheme: { ...preset.ticker },
    profile: {
      name: b.businessName,
      tagline: b.tagline || undefined,
      categories,
      city: b.city || undefined,
      showShare: true,
    },
    contact: contactFrom(b),
    ticker: { enabled: false, items: [] },
    blocks: blocksFor(segment, b),
    floatingWhatsapp: true,
  };
}
