import {
  HERO_DEFAULTS,
  type BioDocument,
  type Block,
  type BlockOf,
  type Contact,
  type Hero,
  type Theme,
} from "./bio";
import type { PatternId } from "./patterns";
import { THEMES, type ThemeId } from "./themes";

/**
 * Operações determinísticas do editor visual. Cada uma recebe o documento e devolve um novo
 * (o original não é alterado). A validação completa fica com `validateBio`.
 */
export type Operation =
  | { type: "profile"; patch: Partial<BioDocument["profile"]> }
  | { type: "contact"; patch: Partial<Record<keyof Contact, Contact[keyof Contact] | undefined>> }
  | { type: "ticker"; patch: Partial<BioDocument["ticker"]> }
  | { type: "theme-preset"; themeId: ThemeId }
  | { type: "theme"; patch: Partial<Omit<Theme, "colors">> & { colors?: Partial<Theme["colors"]> } }
  | { type: "pattern"; pattern: PatternId }
  | { type: "block-update"; id: string; patch: Record<string, unknown> }
  | { type: "block-add"; block: Block; afterId?: string }
  | { type: "block-remove"; id: string }
  | { type: "block-move"; id: string; delta: -1 | 1 }
  | { type: "block-toggle"; id: string }
  | { type: "floating-whatsapp"; enabled: boolean }
  /** `color` vazio volta ao verde do WhatsApp. */
  | { type: "floating-whatsapp-color"; color?: string }
  | { type: "ticker-theme"; patch: Partial<BioDocument["tickerTheme"]> }
  /** Ajustes do topo; `reset` volta ao visual padrão. */
  | { type: "hero"; patch: Partial<Hero> }
  | { type: "hero-reset" }
  | { type: "meta"; patch: Partial<BioDocument["meta"]> }
  /** Documento inteiro (proposta da IA aplicada, reordenação): entra no desfazer como um passo. */
  | { type: "replace"; document: BioDocument };

/** Remove chaves com `undefined` ou string vazia (campos opcionais "apagados" no editor). */
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  ) as T;
}

export function applyOperation(doc: BioDocument, op: Operation): BioDocument {
  const next = structuredClone(doc);
  switch (op.type) {
    case "profile":
      next.profile = compact({ ...next.profile, ...op.patch });
      break;
    case "contact":
      next.contact = compact({ ...next.contact, ...op.patch }) as Contact;
      break;
    case "ticker":
      next.ticker = compact({ ...next.ticker, ...op.patch });
      break;
    case "theme-preset": {
      const preset = THEMES[op.themeId];
      // Padrão ilustrado, ajustes do topo e estilo dos cartões são escolhas do usuário:
      // sobrevivem à troca de tema.
      next.theme = { ...structuredClone(preset.theme), pattern: next.theme.pattern };
      if (doc.theme.hero) next.theme.hero = structuredClone(doc.theme.hero);
      for (const k of [
        "cardStyle",
        "cardTint",
        "cardTintColor",
        "motion",
        "neonEdges",
        "chips",
        "nameAccent",
        "taglineDark",
        "shine",
        "effects",
      ] as const) {
        if (doc.theme[k] !== undefined)
          Object.assign(next.theme, { [k]: structuredClone(doc.theme[k]) });
      }
      next.tickerTheme = { ...preset.ticker };
      break;
    }
    case "theme":
      next.theme = {
        ...next.theme,
        ...op.patch,
        colors: { ...next.theme.colors, ...op.patch.colors },
      };
      break;
    case "pattern":
      next.theme.pattern = op.pattern;
      break;
    case "block-update": {
      const i = next.blocks.findIndex((b) => b.id === op.id);
      if (i >= 0) next.blocks[i] = compact({ ...next.blocks[i], ...op.patch }) as Block;
      break;
    }
    case "block-add": {
      const at = op.afterId
        ? next.blocks.findIndex((b) => b.id === op.afterId) + 1
        : next.blocks.length;
      next.blocks.splice(at > 0 ? at : next.blocks.length, 0, op.block);
      break;
    }
    case "block-remove":
      next.blocks = next.blocks.filter((b) => b.id !== op.id);
      break;
    case "block-move": {
      const i = next.blocks.findIndex((b) => b.id === op.id);
      const j = i + op.delta;
      if (i >= 0 && j >= 0 && j < next.blocks.length) {
        [next.blocks[i], next.blocks[j]] = [next.blocks[j], next.blocks[i]];
      }
      break;
    }
    case "block-toggle": {
      const b = next.blocks.find((x) => x.id === op.id);
      if (b) b.hidden = !b.hidden;
      break;
    }
    case "floating-whatsapp":
      next.floatingWhatsapp = op.enabled;
      break;
    case "floating-whatsapp-color":
      if (op.color) next.floatingWhatsappColor = op.color;
      else delete next.floatingWhatsappColor;
      break;
    case "hero":
      next.theme.hero = { ...HERO_DEFAULTS, ...next.theme.hero, ...op.patch };
      break;
    case "hero-reset":
      delete next.theme.hero;
      break;
    case "ticker-theme":
      next.tickerTheme = { ...next.tickerTheme, ...op.patch };
      break;
    case "meta":
      next.meta = { ...next.meta, ...op.patch };
      break;
    case "replace":
      return structuredClone(op.document);
  }
  return next;
}

/** Id livre para um novo bloco: "cartao", "cartao-2", "cartao-3"… */
export function uniqueBlockId(doc: BioDocument, base: string): string {
  const ids = new Set(doc.blocks.map((b) => b.id));
  if (!ids.has(base)) return base;
  for (let n = 2; ; n++) if (!ids.has(`${base}-${n}`)) return `${base}-${n}`;
}

export const NEW_BLOCK_TYPES = {
  link: "Cartão (link)",
  wifi: "Wi-Fi",
  hours: "Horários",
  gallery: "Galeria de fotos",
  text: "Texto",
} as const;
export type NewBlockType = keyof typeof NEW_BLOCK_TYPES;

/** Bloco novo com valores iniciais válidos (galeria precisa de ao menos uma imagem). */
export function newBlock(
  doc: BioDocument,
  type: NewBlockType,
  firstImage?: { assetId: string; alt: string },
): Block | null {
  switch (type) {
    case "link":
      // Começa como WhatsApp (válido sem link próprio); o operador troca o tipo no painel.
      return {
        id: uniqueBlockId(doc, "cartao"),
        type: "link",
        action: "whatsapp",
        title: "Novo cartão",
        hidden: false,
        variant: "solid",
      } as BlockOf<"link">;
    case "wifi":
      return {
        id: uniqueBlockId(doc, "wifi"),
        type: "wifi",
        hidden: false,
        title: "Wi-Fi",
        network: "MINHA-REDE",
        password: "",
        security: "nopass",
        showQr: true,
      };
    case "hours":
      return {
        id: uniqueBlockId(doc, "horarios"),
        type: "hours",
        hidden: false,
        title: "Horários",
        rows: [{ days: "Seg a sex", time: "9h – 18h" }],
      };
    case "gallery":
      return firstImage
        ? {
            id: uniqueBlockId(doc, "galeria"),
            type: "gallery",
            hidden: false,
            title: "Galeria",
            images: [firstImage],
          }
        : null;
    case "text":
      return {
        id: uniqueBlockId(doc, "texto"),
        type: "text",
        hidden: false,
        title: "Sobre nós",
        body: "Escreva aqui um texto curto.",
      };
  }
}

/** Histórico com desfazer/refazer (limite de passos para não crescer sem fim). */
export type History = {
  past: BioDocument[];
  present: BioDocument;
  future: BioDocument[];
  /** Último campo alterado e quando — para juntar a digitação num único passo. */
  last?: { key: string; at: number };
};
const LIMIT = 100;
const COALESCE_MS = 1200;

export function historyInit(doc: BioDocument): History {
  return { past: [], present: doc, future: [] };
}

/**
 * Aplica a operação. Com `key` (ex.: "profile.name"), alterações seguidas no mesmo campo em
 * menos de 1,2 s viram um só passo de desfazer (cada tecla não vira um passo).
 */
export function historyApply(h: History, op: Operation, key?: string, now = Date.now()): History {
  const next = applyOperation(h.present, op);
  if (JSON.stringify(next) === JSON.stringify(h.present)) return h;
  const last = key ? { key, at: now } : undefined;
  if (key && h.last && h.last.key === key && now - h.last.at < COALESCE_MS) {
    return { ...h, present: next, future: [], last };
  }
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [], last };
}

export function historyUndo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past.at(-1)!, future: [h.present, ...h.future] };
}

export function historyRedo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

/** Rótulo legível de onde está um erro de validação (para a lista de pendências do editor). */
export function issueLocation(
  doc: BioDocument,
  path: string,
): { tab: EditorTab; blockId?: string; label: string } {
  const [head, index] = path.split(".");
  if (head === "blocks") {
    const b = doc.blocks[Number(index)];
    return {
      tab: "blocks",
      blockId: b?.id,
      label: `Bloco “${b && "title" in b ? (b.title ?? b.id) : b?.id}”`,
    };
  }
  if (head === "profile" || head === "meta") return { tab: "profile", label: "Topo" };
  if (head === "contact") return { tab: "contact", label: "Contato" };
  if (head === "ticker") return { tab: "ticker", label: "Faixa" };
  return { tab: "look", label: "Aparência" };
}

export type EditorTab = "blocks" | "profile" | "contact" | "ticker" | "look" | "ai";
