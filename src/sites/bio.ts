import { z } from "zod";
import { averageHex, contrastRatio, HEX_COLOR, mixHex } from "./color";
import { FONT_IDS, FONTS, isItalicFont } from "./fonts";
import { glossTop, ICON_IDS, type IconId } from "./icons";
import {
  INSTAGRAM_HANDLE,
  isSafeHref,
  WHATSAPP_DIGITS,
  WHATSAPP_GROUP,
  whatsappTarget,
} from "./links";
import { PATTERN_IDS } from "./patterns";

/**
 * Documento de um Bio Site. Versão 2 (a versão 1 era o formato "site em seções", descontinuado
 * em 2026-10-13 sem documentos reais a migrar — D23).
 */
export const BIO_SCHEMA_VERSION = 2;
export const MIN_CONTRAST = 4.5;
/** Elementos gráficos sem texto (ícone do botão flutuante): WCAG 1.4.11. */
export const MIN_GRAPHIC_CONTRAST = 3;

const hex = z.string().regex(HEX_COLOR, "cor no formato #rrggbb");
const safeUrl = z.string().trim().max(500).refine(isSafeHref, "link inválido ou inseguro");
const text = (max: number) => z.string().trim().min(1).max(max);
const optText = (max: number) => z.string().trim().max(max).optional();

export const imageRef = z.object({
  assetId: z.uuid(),
  alt: z.string().trim().max(200),
  /** Título e legenda da foto (só aparecem na galeria em cartão, ex.: "Meus trabalhos"). */
  title: optText(60),
  caption: optText(240),
});
export type ImageRef = z.infer<typeof imageRef>;

/** Vídeo enviado pelo cliente (tabela `videos`; capa e dimensões vêm de lá). */
export const videoRef = z.object({
  videoId: z.uuid(),
  caption: optText(240),
});
export type VideoRef = z.infer<typeof videoRef>;

/** Foto ou vídeo de um trabalho (serviços da Reistyle: fotos e vídeos junto do preço). */
export const mediaItem = z.discriminatedUnion("kind", [
  imageRef.extend({ kind: z.literal("image") }),
  videoRef.extend({ kind: z.literal("video") }),
]);
export type MediaItem = z.infer<typeof mediaItem>;

function checkContrast(
  ctx: z.RefinementCtx,
  path: (string | number)[],
  fg: string,
  bg: string,
  label: string,
  min = MIN_CONTRAST,
) {
  const ratio = contrastRatio(fg, bg);
  if (ratio < min) {
    ctx.addIssue({
      code: "custom",
      path,
      message: `contraste ${label} é ${ratio.toFixed(2)}; mínimo ${min}`,
    });
  }
}

const WHITE = "#ffffff";

/**
 * Ajustes do topo (texto, escurecimento, desfoque, borda do logo). Ausente = visual padrão.
 * O escurecimento é um degradê: começa em 65% da opacidade escolhida e termina em 130%.
 */
export const heroSchema = z.object({
  text: hex,
  veil: hex,
  veilOpacity: z.int().min(0).max(90),
  blur: z.int().min(0).max(40),
  logoBorder: hex,
});
export type Hero = z.infer<typeof heroSchema>;
export const HERO_DEFAULTS: Hero = {
  text: WHITE,
  veil: "#000000",
  veilOpacity: 48,
  blur: 22,
  logoBorder: WHITE,
};
export const veilAlphas = (h: Hero) => [
  (h.veilOpacity / 100) * 0.65,
  Math.min(0.95, (h.veilOpacity / 100) * 1.3),
];

export const CARD_STYLES = [
  "theme",
  "light",
  "glass",
  "neon",
  "tint",
  "dark",
  "satin",
  "deep",
] as const;
export type CardStyle = (typeof CARD_STYLES)[number];
/**
 * Visual padrão (referências do usuário, 2026-10-20 — D41): todos os cartões iguais e sem halo,
 * fundo do ramo, topo legível sobre qualquer fundo. Estilos de cartão: vidro neon (ref. 2),
 * cor do ícone (ref. 3), escuro (ref. 1), cetim (claro, texto na cor dos painéis) e cor dos
 * cartões (degradê "Cartões" do tema com texto em cor própria — Mage Beauty, cacau e dourado).
 */
export const STANDARD_CARD_STYLES = ["neon", "tint", "dark", "satin", "deep"] as const;
export const isStandardStyle = (s: CardStyle | undefined) =>
  (STANDARD_CARD_STYLES as readonly (CardStyle | undefined)[]).includes(s);
/** Base dos cartões do visual padrão: a cor do texto dos painéis puxada para o grafite. */
export const standardCardBase = (ink: string) => mixHex(ink, "#1b1f2e", 0.5);
/** Quanto o vidro clareia o fundo (aproximação para conferir o contraste). */
export const GLASS_TINT = 0.12;
/** Vidro colorido do futurista: a cor misturada ao grafite (texto branco por cima). */
export const GLASS_DARK = "#262a38";
export const GLASS_COLOR_MIX = 0.42;
export const glassTop = (color: string) => mixHex(GLASS_DARK, color, GLASS_COLOR_MIX);
/** Cetim: cartão creme (fundo da página bem clareado); o texto usa a cor dos painéis. */
export const satinCard = (base: string) => mixHex(base, WHITE, 0.8);
/** Vidro neon com cores próprias: do fundo da página até ele levemente tingido pela borda. */
export const neonGlass = (base: string, edge: string): [string, string] => [
  base,
  mixHex(base, edge, 0.15),
];

export const themeSchema = z
  .object({
    colors: z.object({
      /** Cor de fundo da página (atrás da foto). */
      base: hex,
      /** Degradê dos cartões (texto branco por cima). */
      cardTop: hex,
      cardBottom: hex,
      /** Categorias no topo (sobre o fundo escuro). */
      accent: hex,
      /** Texto em painéis claros. */
      ink: hex,
      inkMuted: hex,
      /** Monograma do logo, quando não há imagem. */
      logoBg: hex,
      logoFg: hex,
      /** Cores do "fundo de foto" quando não há imagem de fundo. */
      glow1: hex,
      glow2: hex,
      glow3: hex,
    }),
    fonts: z.object({ display: z.enum(FONT_IDS), body: z.enum(FONT_IDS) }),
    radius: z.enum(["square", "soft", "pill"]),
    pattern: z.enum(PATTERN_IDS),
    hero: heroSchema.optional(),
    /** Estilo dos cartões: cor do tema (ausente), claros, vidro escuro ou um dos padrões (D41). */
    cardStyle: z.enum(CARD_STYLES).optional(),
    /** Futurista: vidro na cor de cada ícone (ausente), preto transparente ou uma cor só. */
    cardTint: z.enum(["icon", "black", "custom"]).optional(),
    cardTintColor: hex.optional(),
    /** Futurista: fundo em movimento nas cores do topo (ausente = ligado). */
    motion: z.boolean().optional(),
    /** Vidro neon: cores da borda (ausente = ciano → rosa). O vidro puxa a cor de fundo da página. */
    neonEdges: z.object({ start: hex, end: hex }).optional(),
    /** Visual padrão: categorias numa cor própria (ausente = cor do texto dos painéis, letra branca). */
    chips: z.object({ bg: hex, fg: hex }).optional(),
    /** Visual padrão: cor da última palavra do nome (ex.: "Rota 316" com o 316 em amarelo). */
    nameAccent: hex.optional(),
    /** Visual padrão: slogan numa faixa escura (ausente = faixa clara). */
    taglineDark: z.boolean().optional(),
    /** Visual padrão: reflexo de luz passando devagar sobre o fundo da página. */
    shine: z.boolean().optional(),
    /**
     * Visual padrão: efeitos animados atrás do conteúdo. "electric" = raios, tubos e rastros de neon,
     * luz nas bordas, engrenagens, faíscas, anel no logo solto e entrada dos cartões (Rota 316).
     * Cores da borda neon (`neonEdges`). Parados para quem desligou as animações.
     * "glitter" = glitter caindo e cintilando, pétalas, anel no logo e entrada dos cartões
     * (Mage Beauty); glitter nas cores da borda, contornado na cor do texto dos painéis.
     * "slabs" = placas em ângulo que deslizam sobre o fundo, com luz correndo pelas quinas, e o
     * fundo da página aproximando devagar (Reistyle); luz nas cores da borda.
     * "bubbles" = bolhas de sabão subindo devagar, bolhas grandes desfocadas e brilhos de 4 pontas
     * piscando, com uma onda no rodapé (Casa Limpa, limpeza residencial).
     */
    effects: z.enum(["electric", "glitter", "slabs", "bubbles"]).optional(),
    /**
     * Ícones em círculo branco com o desenho na cor do texto dos painéis (Casa Limpa). Ícones de
     * marca (Instagram, Google, Pix) e os de cor própria continuam como são.
     */
    iconsLight: z.boolean().optional(),
    /** Cor dos cartões: cor do texto (ausente = branco), sobre o degradê cardTop → cardBottom. */
    cardText: hex.optional(),
    /** Visual padrão sobre fundo claro: topo com texto na cor dos painéis (o cetim já é assim). */
    lightPage: z.boolean().optional(),
    /**
     * Visual escuro (Reistyle, preto e dourado): painéis, etiquetas e rodapé no degradê dos cartões
     * com o texto dos cartões (contraste já conferido em cardTop/cardBottom), e bordas dos
     * cartões só nas cores da borda (sem a cor de cada ícone).
     */
    darkPanels: z.boolean().optional(),
  })
  .superRefine((t, ctx) => {
    const c = t.colors;
    if (t.hero) {
      // Fundo sem foto: média das cores desfocadas sob o escurecimento (parte mais clara, no alto).
      const bg = mixHex(
        averageHex([c.base, c.glow1, c.glow2, c.glow3]),
        t.hero.veil,
        veilAlphas(t.hero)[0],
      );
      checkContrast(ctx, ["hero", "text"], t.hero.text, bg, "do texto do topo sobre o fundo");
    }
    checkContrast(ctx, ["colors", "cardTop"], WHITE, c.cardTop, "branco/cardTop");
    checkContrast(ctx, ["colors", "cardBottom"], WHITE, c.cardBottom, "branco/cardBottom");
    checkContrast(ctx, ["colors", "accent"], c.accent, c.base, "accent/base");
    checkContrast(ctx, ["colors", "ink"], c.ink, WHITE, "ink/branco");
    checkContrast(ctx, ["colors", "inkMuted"], c.inkMuted, WHITE, "inkMuted/branco");
    checkContrast(ctx, ["colors", "logoFg"], c.logoFg, c.logoBg, "logoFg/logoBg");
    if (t.cardTint === "custom" && t.cardTintColor) {
      checkContrast(
        ctx,
        ["cardTintColor"],
        WHITE,
        glassTop(t.cardTintColor),
        "do texto branco sobre a cor dos cartões",
      );
    }
    if (t.cardStyle === "satin" || (isStandardStyle(t.cardStyle) && t.lightPage)) {
      // Nome grande direto sobre o fundo claro da página, na cor do texto dos painéis.
      checkContrast(
        ctx,
        ["colors", "ink"],
        c.ink,
        c.base,
        "do nome sobre o fundo da página",
        MIN_GRAPHIC_CONTRAST,
      );
    }
    if (t.cardStyle === "satin") {
      const card = satinCard(c.base);
      checkContrast(ctx, ["colors", "ink"], c.ink, card, "do texto sobre os cartões cetim");
      checkContrast(ctx, ["colors", "inkMuted"], c.inkMuted, card, "do subtítulo sobre o cetim");
    } else if (t.cardStyle === "deep") {
      const fg = t.cardText ?? WHITE;
      checkContrast(ctx, ["cardText"], fg, c.cardTop, "do texto sobre os cartões (topo)");
      checkContrast(ctx, ["cardText"], fg, c.cardBottom, "do texto sobre os cartões (base)");
    } else if (isStandardStyle(t.cardStyle)) {
      checkContrast(
        ctx,
        ["colors", "ink"],
        WHITE,
        standardCardBase(c.ink),
        "do texto branco sobre os cartões (cor do texto dos painéis)",
      );
    }
    if (isItalicFont(t.fonts.body)) {
      ctx.addIssue({
        code: "custom",
        path: ["fonts", "body"],
        message: `${FONTS[t.fonts.body].label} é só para títulos`,
      });
    }
    // No cetim o texto é escuro sobre creme (conferido acima); a borda é só enfeite.
    if (t.neonEdges && t.cardStyle !== "satin" && t.cardStyle !== "deep") {
      checkContrast(
        ctx,
        ["neonEdges", "start"],
        WHITE,
        neonGlass(c.base, t.neonEdges.start)[1],
        "do texto branco sobre o vidro neon (fundo da página + cor da borda)",
      );
    }
    if (t.chips) {
      checkContrast(ctx, ["chips", "fg"], t.chips.fg, t.chips.bg, "das categorias (letra/fundo)");
    }
    if (t.nameAccent) {
      // Nome grande com contorno na cor do texto dos painéis: basta o contraste de texto grande.
      checkContrast(
        ctx,
        ["nameAccent"],
        t.nameAccent,
        c.ink,
        "do destaque do nome sobre o contorno",
        MIN_GRAPHIC_CONTRAST,
      );
    }
    if (t.cardStyle === "glass") {
      // Vidro: texto branco sobre a cor de fundo levemente clareada pelo vidro.
      checkContrast(
        ctx,
        ["colors", "base"],
        WHITE,
        mixHex(c.base, WHITE, GLASS_TINT),
        "do texto branco sobre os cartões de vidro (cor de base)",
      );
    }
  });
export type Theme = z.infer<typeof themeSchema>;

/** Dados de contato centrais: os cartões de Instagram, WhatsApp, Google etc. leem daqui. */
export const contactSchema = z.object({
  instagram: z.string().regex(INSTAGRAM_HANDLE, "Instagram: só o nome do perfil").optional(),
  whatsapp: z
    .string()
    .regex(WHATSAPP_DIGITS, "WhatsApp: só dígitos com DDI, ex. 5511999998888")
    .optional(),
  whatsappMessage: optText(200),
  /** Grupo do WhatsApp (convite). Sem número, os botões de WhatsApp abrem o grupo (sem mensagem). */
  whatsappGroup: z
    .string()
    .regex(WHATSAPP_GROUP, "grupo: link de convite, ex. https://chat.whatsapp.com/AbC123…")
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, "telefone: só dígitos, ex. 551133330000")
    .optional(),
  email: z.email().optional(),
  googleReviewUrl: safeUrl.optional(),
  googleRating: z.number().min(1).max(5).optional(),
  googleReviewCount: z.int().min(0).max(1_000_000).optional(),
  address: optText(160),
  mapsUrl: safeUrl.optional(),
  facebookUrl: safeUrl.optional(),
  tiktok: z.string().regex(INSTAGRAM_HANDLE, "TikTok: só o nome do perfil").optional(),
  youtubeUrl: safeUrl.optional(),
});
export type Contact = z.infer<typeof contactSchema>;

/** O que o cartão faz. Os de serviço montam o link a partir de `contact` (sem duplicar dados). */
export const LINK_ACTIONS = [
  "instagram",
  "google_review",
  "whatsapp",
  "phone",
  "maps",
  "url",
] as const;
export type LinkAction = (typeof LINK_ACTIONS)[number];

const blockBase = {
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,39}$/),
  hidden: z.boolean().default(false),
};

/** Cor própria do ícone do bloco (ausente = cor padrão do ícone). O desenho é branco. */
const iconColor = { iconColor: hex.optional() };
function checkIconColor(ctx: z.RefinementCtx, color: string | undefined) {
  if (color) {
    checkContrast(
      ctx,
      ["iconColor"],
      WHITE,
      glossTop(color),
      "do desenho branco sobre a cor do ícone",
      MIN_GRAPHIC_CONTRAST,
    );
  }
}

export const linkBlock = z
  .object({
    ...blockBase,
    type: z.literal("link"),
    action: z.enum(LINK_ACTIONS),
    title: text(60),
    /** Vazio = texto automático (ex.: nota do Google, endereço). */
    subtitle: optText(90),
    badge: optText(30),
    /** Cartão em destaque: cor viva com halo de luz (no máximo um por Bio Site, sugerido). */
    featured: z.boolean().optional(),
    /** Visual do destaque: cheio na cor do ícone (ausente) ou neon (vidro escuro, luz na cor). */
    featureStyle: z.enum(["color", "neon"]).optional(),
    /** Só o nome, sem ícone (ex.: "Feedback de clientes"). */
    hideIcon: z.boolean().optional(),
    /** Etiqueta no canto do cartão (ex.: "Novo"). */
    tag: optText(14),
    /** Valor à direita, no lugar da seta (ex.: "12 mil", "4,9 ★"). */
    value: optText(12),
    /** Só para action "url". */
    url: safeUrl.optional(),
    /** Só para action "url" (os demais usam o ícone do serviço). */
    icon: z.enum(ICON_IDS).optional(),
    variant: z.enum(["solid", "light"]).default("solid"),
    /** Degradê próprio do cartão (só no estilo "solid"); ausente = cores do tema. */
    colors: z.object({ top: hex, bottom: hex }).optional(),
    ...iconColor,
  })
  .superRefine((b, ctx) => {
    checkIconColor(ctx, b.iconColor);
    if (b.colors && b.variant === "solid") {
      checkContrast(ctx, ["colors", "top"], WHITE, b.colors.top, "branco/cor do cartão (topo)");
      checkContrast(
        ctx,
        ["colors", "bottom"],
        WHITE,
        b.colors.bottom,
        "branco/cor do cartão (base)",
      );
    }
    if (b.action === "url" && !b.url) {
      ctx.addIssue({ code: "custom", path: ["url"], message: "informe o link do cartão" });
    }
  });

export const wifiBlock = z
  .object({
    ...blockBase,
    type: z.literal("wifi"),
    title: text(40).default("Wi-Fi"),
    network: text(32),
    password: z.string().max(63).default(""),
    security: z.enum(["WPA", "WEP", "nopass"]).default("WPA"),
    showQr: z.boolean().default(false),
    ...iconColor,
  })
  .superRefine((b, ctx) => checkIconColor(ctx, b.iconColor));

/** Pagamento por Pix: chave, recebedor e QR "copia e cola" sem valor (src/sites/pix.ts). */
export const pixBlock = z
  .object({
    ...blockBase,
    type: z.literal("pix"),
    title: text(40).default("Pagar com Pix"),
    key: text(77),
    /** Nome do recebedor como aparece no banco (o QR usa só as 25 primeiras letras). */
    name: text(60),
    city: text(15),
    /** Banco de destino, só para conferência de quem paga (ex.: "CloudWalk"). */
    bank: optText(40),
    showQr: z.boolean().default(false),
    ...iconColor,
  })
  .superRefine((b, ctx) => checkIconColor(ctx, b.iconColor));

export const hoursBlock = z
  .object({
    ...blockBase,
    type: z.literal("hours"),
    title: text(40).default("Horários"),
    rows: z
      .array(z.object({ days: text(40), time: text(40) }))
      .min(1)
      .max(10),
    ...iconColor,
  })
  .superRefine((b, ctx) => checkIconColor(ctx, b.iconColor));

export const galleryBlock = z
  .object({
    ...blockBase,
    type: z.literal("gallery"),
    title: text(40),
    images: z.array(imageRef).min(1).max(12),
    /** Painel com as fotos (ausente) ou cartão que abre as fotos com legenda ("Meus trabalhos"). */
    display: z.enum(["panel", "card"]).optional(),
    /** Só no cartão: texto embaixo do título e opção de mostrar só o nome. */
    subtitle: optText(90),
    hideIcon: z.boolean().optional(),
    /** Só no cartão: ícone (ausente = fotos), ex.: roda para "Meus serviços" de oficina. */
    icon: z.enum(ICON_IDS).optional(),
    /** Só no cartão: a primeira foto vira o ícone (ex.: "Maquiagens", "Acessórios"). */
    iconPhoto: z.boolean().optional(),
    ...iconColor,
  })
  .superRefine((b, ctx) => checkIconColor(ctx, b.iconColor));

/**
 * Catálogo com carrinho (Mage Beauty, 2026-10-24): categorias com até 10 produtos em estoque.
 * Quem visita escolhe produtos de várias categorias e envia o pedido inteiro pelo WhatsApp do
 * cliente (nada é pago no site). Preço opcional, em centavos; sem preço, nada aparece (o cliente
 * põe o preço na descrição da foto) e o pedido sai sem total.
 */
export const MAX_CATALOG_CATEGORIES = 12;
export const MAX_CATALOG_PRODUCTS = 10;
export const MAX_PRODUCT_MEDIA = 8;
const itemId = z.string().regex(/^[a-z0-9][a-z0-9-]{0,19}$/);
export const catalogProduct = z.object({
  id: itemId,
  name: text(60),
  priceCents: z.int().min(0).max(10_000_000).optional(),
  image: imageRef,
  /** Mais fotos e vídeos do produto/serviço, depois da foto principal (abrem ao tocar na foto). */
  media: z.array(mediaItem).max(MAX_PRODUCT_MEDIA).optional(),
});
export const catalogCategory = z.object({
  id: itemId,
  name: text(40),
  /** Etiqueta no canto da foto (ex.: "Mais vendidos", "Novidade"). */
  tag: optText(20),
  /** Foto da categoria na vitrine; ausente = foto do primeiro produto. */
  cover: imageRef.optional(),
  products: z.array(catalogProduct).min(1).max(MAX_CATALOG_PRODUCTS),
});
export type CatalogCategory = z.infer<typeof catalogCategory>;
export const catalogBlock = z
  .object({
    ...blockBase,
    type: z.literal("catalog"),
    title: text(40).default("Nossos produtos"),
    subtitle: optText(120),
    /**
     * "order" (ausente) = carrinho e pedido pelo WhatsApp; "book" = serviços com preço e botão
     * "Agendar" em cada um, sem carrinho (abre o WhatsApp ou o grupo).
     */
    mode: z.enum(["order", "book"]).optional(),
    categories: z.array(catalogCategory).min(1).max(MAX_CATALOG_CATEGORIES),
  })
  .superRefine((b, ctx) => {
    const cats = new Set<string>();
    b.categories.forEach((c, i) => {
      if (cats.has(c.id))
        ctx.addIssue({ code: "custom", path: ["categories", i, "id"], message: "id repetido" });
      cats.add(c.id);
      const prods = new Set<string>();
      c.products.forEach((p, j) => {
        if (prods.has(p.id))
          ctx.addIssue({
            code: "custom",
            path: ["categories", i, "products", j, "id"],
            message: "id repetido",
          });
        prods.add(p.id);
      });
    });
  });

/**
 * Equipe ("Meu time", Reistyle): cartão com os rostos que abre o perfil de cada pessoa (foto,
 * função, frase, especialidades) e o botão de agendar.
 */
export const MAX_TEAM_MEMBERS = 12;
export const teamMember = z.object({
  id: itemId,
  name: text(40),
  role: optText(40),
  bio: optText(240),
  skills: z.array(text(24)).max(5).optional(),
  photo: imageRef,
});
export type TeamMember = z.infer<typeof teamMember>;
export const teamBlock = z
  .object({
    ...blockBase,
    type: z.literal("team"),
    title: text(40).default("Meu time"),
    subtitle: optText(90),
    members: z.array(teamMember).min(1).max(MAX_TEAM_MEMBERS),
    ...iconColor,
  })
  .superRefine((b, ctx) => {
    checkIconColor(ctx, b.iconColor);
    const ids = new Set<string>();
    b.members.forEach((m, i) => {
      if (ids.has(m.id))
        ctx.addIssue({ code: "custom", path: ["members", i, "id"], message: "id repetido" });
      ids.add(m.id);
    });
  });

/**
 * Pedir orçamento (Casa Limpa, 2026-10-27): perguntas de tocar (uma ou várias opções) e de
 * escrever; as respostas viram a mensagem pronta no WhatsApp do cliente (src/sites/quote.ts).
 * Precisa do número em Contato (link de grupo não leva mensagem).
 */
export const MAX_QUOTE_QUESTIONS = 8;
export const MAX_QUOTE_OPTIONS = 8;
export const quoteQuestion = z.object({
  id: itemId,
  label: text(60),
  /** "single" = uma opção; "multi" = várias; "text" = a pessoa escreve (ex.: bairro). */
  kind: z.enum(["single", "multi", "text"]),
  options: z.array(text(30)).max(MAX_QUOTE_OPTIONS).default([]),
  required: z.boolean().default(true),
  placeholder: optText(60),
});
export type QuoteQuestion = z.infer<typeof quoteQuestion>;
export const quoteBlock = z
  .object({
    ...blockBase,
    type: z.literal("quote"),
    title: text(40).default("Pedir orçamento"),
    subtitle: optText(90),
    /** Texto no alto do painel (ex.: "O valor depende do tamanho da casa…"). */
    intro: optText(200),
    /** Aviso antes do botão de enviar (ex.: "Eu uso os produtos de limpeza da sua casa."). */
    note: optText(160),
    /** Primeira linha da mensagem; as respostas vêm embaixo, uma por linha. */
    greeting: text(200).default("Oi! Vim pelo Bio Site e gostaria de um orçamento."),
    questions: z.array(quoteQuestion).min(1).max(MAX_QUOTE_QUESTIONS),
    /** Degradê próprio do cartão (texto branco), com contorno claro: o cartão principal. */
    colors: z.object({ top: hex, bottom: hex }).optional(),
    ...iconColor,
  })
  .superRefine((b, ctx) => {
    checkIconColor(ctx, b.iconColor);
    if (b.colors) {
      checkContrast(ctx, ["colors", "top"], WHITE, b.colors.top, "branco/cor do cartão (topo)");
      checkContrast(
        ctx,
        ["colors", "bottom"],
        WHITE,
        b.colors.bottom,
        "branco/cor do cartão (base)",
      );
    }
    const ids = new Set<string>();
    b.questions.forEach((q, i) => {
      if (ids.has(q.id))
        ctx.addIssue({ code: "custom", path: ["questions", i, "id"], message: "id repetido" });
      ids.add(q.id);
      if (q.kind !== "text" && q.options.length < 2)
        ctx.addIssue({
          code: "custom",
          path: ["questions", i, "options"],
          message: `“${q.label}”: escreva ao menos duas opções`,
        });
    });
  });

/**
 * Vídeos em destaque ("Meus trabalhos", Casa Limpa): quadro com os vídeos lado a lado; o
 * primeiro toca sozinho, sem som (`autoplay`); tocar em qualquer um abre o vídeo grande, com som.
 */
export const MAX_VIDEOS_BLOCK = 6;
export const videosBlock = z.object({
  ...blockBase,
  type: z.literal("videos"),
  title: text(40).default("Meus trabalhos"),
  subtitle: optText(40),
  videos: z
    .array(videoRef.extend({ title: optText(40) }))
    .min(1)
    .max(MAX_VIDEOS_BLOCK),
  autoplay: z.boolean().default(true),
});

export const textBlock = z.object({
  ...blockBase,
  type: z.literal("text"),
  title: optText(60),
  body: text(1000),
});

export const anyBlock = z.discriminatedUnion("type", [
  linkBlock,
  wifiBlock,
  hoursBlock,
  galleryBlock,
  textBlock,
  pixBlock,
  catalogBlock,
  teamBlock,
  quoteBlock,
  videosBlock,
]);
export type Block = z.infer<typeof anyBlock>;
export type BlockOf<T extends Block["type"]> = Extract<Block, { type: T }>;

export const tickerSchema = z
  .object({
    enabled: z.boolean(),
    items: z.array(text(60)).max(8),
    /** Ausente = cores do tema. */
    colors: z.object({ bg: hex, fg: hex }).optional(),
  })
  .superRefine((t, ctx) => {
    if (t.enabled && t.items.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "escreva ao menos uma frase ou desative a faixa",
      });
    }
    if (t.colors)
      checkContrast(ctx, ["colors", "fg"], t.colors.fg, t.colors.bg, "da faixa (letra/fundo)");
  });

export const bioDocumentSchema = z
  .object({
    schemaVersion: z.literal(BIO_SCHEMA_VERSION),
    meta: z.object({ title: text(70), description: text(160) }),
    theme: themeSchema,
    /** Cores padrão da faixa quando ela não define as próprias. */
    tickerTheme: z.object({ bg: hex, fg: hex }),
    profile: z.object({
      name: text(60),
      tagline: optText(120),
      logo: imageRef.optional(),
      categories: z.array(text(24)).max(6).default([]),
      city: optText(40),
      showShare: z.boolean().default(true),
      background: imageRef.optional(),
      /** Como mostrar a foto de fundo: desfocada atrás de tudo (ausente) ou nítida no alto. */
      backgroundMode: z.enum(["blur", "cover"]).optional(),
      /** Logo no círculo (ausente) ou solto e maior, sem moldura (escudos e logos recortados). */
      logoFrame: z.enum(["circle", "none"]).optional(),
      /** Fundo da página conforme o ramo (ex.: céu com arco-íris), parado enquanto a página rola. */
      pageBackground: imageRef.optional(),
      /** O logo já traz o nome e o slogan: escondidos na tela (ficam para leitores de tela e buscas). */
      logoHasName: z.boolean().optional(),
      /** Com `logoHasName`: o logo traz só o nome; o slogan continua à vista. */
      keepTagline: z.boolean().optional(),
      /** Largura do logo sem moldura, em px (ausente = tamanho padrão). */
      logoWidth: z.int().min(120).max(300).optional(),
      /** Área de atendimento, no rodapé (ex.: "Atendimento em toda Fortaleza e região"). */
      serviceArea: optText(120),
    }),
    contact: contactSchema,
    ticker: tickerSchema,
    blocks: z.array(anyBlock).max(30),
    floatingWhatsapp: z.boolean().default(true),
    /** Cor do botão flutuante; ausente = verde do WhatsApp. */
    floatingWhatsappColor: hex.optional(),
  })
  .superRefine((doc, ctx) => {
    checkContrast(
      ctx,
      ["tickerTheme", "fg"],
      doc.tickerTheme.fg,
      doc.tickerTheme.bg,
      "da faixa padrão",
    );
    if (doc.floatingWhatsappColor) {
      checkContrast(
        ctx,
        ["floatingWhatsappColor"],
        WHITE,
        doc.floatingWhatsappColor,
        "do ícone do botão do WhatsApp",
        MIN_GRAPHIC_CONTRAST,
      );
    }
    if (doc.theme.cardStyle === "tint") {
      // Cor do ícone: o lado esquerdo do cartão leva a cor própria do ícone, misturada ao grafite.
      doc.blocks.forEach((b, i) => {
        if (b.type === "link" && b.iconColor && !b.hideIcon)
          checkContrast(
            ctx,
            ["blocks", i, "iconColor"],
            WHITE,
            glassTop(b.iconColor),
            "do texto branco sobre o cartão na cor do ícone",
          );
      });
    }
    const catalogs = doc.blocks.filter((b) => b.type === "catalog");
    if (catalogs.length > 1) {
      ctx.addIssue({ code: "custom", path: ["blocks"], message: "só um catálogo por Bio Site" });
    }
    const cat = catalogs[0];
    if (cat && cat.mode !== "book" && !doc.contact.whatsapp) {
      ctx.addIssue({
        code: "custom",
        path: ["contact", "whatsapp"],
        message: "o catálogo envia o pedido pelo WhatsApp: preencha o WhatsApp em Contato",
      });
    }
    if (cat?.mode === "book" && !doc.contact.whatsapp && !doc.contact.whatsappGroup) {
      ctx.addIssue({
        code: "custom",
        path: ["contact", "whatsapp"],
        message: "o botão Agendar abre o WhatsApp: preencha o WhatsApp ou o grupo em Contato",
      });
    }
    doc.blocks.forEach((b, i) => {
      if (b.type === "quote" && !doc.contact.whatsapp)
        ctx.addIssue({
          code: "custom",
          path: ["blocks", i],
          message:
            "o orçamento vai pelo WhatsApp com a mensagem pronta: preencha o número em Contato",
        });
    });
    const seen = new Set<string>();
    doc.blocks.forEach((b, i) => {
      if (seen.has(b.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["blocks", i, "id"],
          message: `id repetido: ${b.id}`,
        });
      }
      seen.add(b.id);
    });
  });

export type BioDocument = z.infer<typeof bioDocumentSchema>;

export type ValidationResult =
  { ok: true; document: BioDocument } | { ok: false; issues: { path: string; message: string }[] };

/** Valida um documento vindo de fora (editor, IA, banco). Nunca lança. */
export function validateBio(input: unknown): ValidationResult {
  const parsed = bioDocumentSchema.safeParse(input);
  if (parsed.success) return { ok: true, document: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

/** Todas as imagens referenciadas (para carregar dimensões e conferir a posse). */
export function collectImageRefs(doc: BioDocument): ImageRef[] {
  const refs: ImageRef[] = [];
  if (doc.profile.logo) refs.push(doc.profile.logo);
  if (doc.profile.background) refs.push(doc.profile.background);
  if (doc.profile.pageBackground) refs.push(doc.profile.pageBackground);
  for (const b of doc.blocks) {
    if (b.type === "gallery") refs.push(...b.images);
    if (b.type === "catalog")
      for (const c of b.categories) {
        if (c.cover) refs.push(c.cover);
        for (const p of c.products) {
          refs.push(p.image);
          for (const m of p.media ?? []) if (m.kind === "image") refs.push(m);
        }
      }
    if (b.type === "team") refs.push(...b.members.map((m) => m.photo));
  }
  return refs;
}

/** Todos os vídeos referenciados (para carregar capa e dimensões e conferir a posse). */
export function collectVideoRefs(doc: BioDocument): VideoRef[] {
  const refs: VideoRef[] = [];
  for (const b of doc.blocks) {
    if (b.type === "videos") refs.push(...b.videos);
    if (b.type === "catalog")
      for (const c of b.categories)
        for (const p of c.products)
          for (const m of p.media ?? []) if (m.kind === "video") refs.push(m);
  }
  return refs;
}

export type ResolvedLink = { href: string; icon: IconId; subtitle?: string; external: boolean };

/**
 * Monta o destino, o ícone e o subtítulo automático de um cartão a partir dos dados de contato.
 * Retorna `null` quando falta o dado necessário (o cartão não é exibido).
 */
export function resolveLink(block: BlockOf<"link">, c: Contact): ResolvedLink | null {
  switch (block.action) {
    case "instagram":
      return c.instagram
        ? {
            href: `https://instagram.com/${c.instagram}`,
            icon: "instagram",
            subtitle: "Siga no Instagram",
            external: true,
          }
        : null;
    case "google_review":
      return c.googleReviewUrl
        ? { href: c.googleReviewUrl, icon: "google", subtitle: "Sua opinião ajuda", external: true }
        : null;
    case "whatsapp": {
      // Sem número, o grupo (quando há): link de grupo não leva mensagem pronta.
      const href = whatsappTarget(c, c.whatsappMessage);
      return href ? { href, icon: "whatsapp", external: true } : null;
    }
    case "phone":
      return c.phone
        ? { href: `tel:${c.phone}`, icon: "phone", subtitle: formatPhone(c.phone), external: false }
        : null;
    case "maps": {
      if (!c.address && !c.mapsUrl) return null;
      const href =
        c.mapsUrl ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address!)}`;
      return { href, icon: "maps", subtitle: c.address, external: true };
    }
    case "url":
      return block.url ? { href: block.url, icon: block.icon ?? "link", external: true } : null;
  }
}

/** "Rota 316" → ["Rota ", "316"] (a última palavra leva o destaque); nome de uma palavra → null. */
export function splitNameAccent(name: string): [string, string] | null {
  const m = name.match(/^(.*\s)(\S+)$/);
  return m ? [m[1], m[2]] : null;
}

/** 5511999998888 → (11) 99999-8888; outros formatos ficam como vieram. */
export function formatPhone(digits: string): string {
  const d = digits.replace(/^\+/, "");
  const m = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digits;
}

/** Texto do QR code de Wi-Fi (padrão "WIFI:" entendido pelas câmeras de iOS e Android). */
export function wifiQrPayload(b: BlockOf<"wifi">): string {
  const esc = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
  const pass = b.security === "nopass" ? "" : `P:${esc(b.password)};`;
  return `WIFI:T:${b.security};S:${esc(b.network)};${pass};`;
}
