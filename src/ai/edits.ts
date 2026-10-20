import { z } from "zod";
import {
  LINK_ACTIONS,
  resolveLink,
  validateBio,
  type BioDocument,
  type Block,
  type BlockOf,
} from "@/sites/bio";
import { ICON_IDS } from "@/sites/icons";
import { applyOperation, uniqueBlockId, type Operation } from "@/sites/operations";
import { applyStandardLook } from "@/sites/templates";

/**
 * O que a IA pode devolver: uma lista de alterações (nunca o documento inteiro nem HTML).
 * Cada alteração é aplicada pelas operações determinísticas do editor e conferida pelo schema
 * do Bio Site; a que deixaria o documento inválido é descartada com o motivo (D1, D3).
 * Sem limites de tamanho aqui (a resposta estruturada da API não os garante): quem limita é
 * `validateBio`.
 */
const hexish = z.string().describe("cor #rrggbb");

export const aiEditSchema = z.object({
  summary: z.string().describe("Resumo curto, em português, do que foi mudado e por quê."),
  edits: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("set_profile"),
        tagline: z.string().optional().describe("Slogan, até 120 caracteres."),
        categories: z
          .array(z.string())
          .optional()
          .describe("Até 6 etiquetas, cada uma com até 24 caracteres, sem emojis."),
      }),
      z.object({
        type: z.literal("set_description"),
        description: z.string().describe("Descrição para Google e WhatsApp, até 160 caracteres."),
      }),
      z.object({
        type: z.literal("set_ticker"),
        enabled: z.boolean(),
        items: z.array(z.string()).describe("Até 8 frases curtas (até 60 caracteres)."),
      }),
      z.object({
        type: z.literal("update_card"),
        id: z.string(),
        title: z.string().optional().describe("Até 60 caracteres."),
        subtitle: z.string().optional().describe("Até 90 caracteres; vazio = texto automático."),
        badge: z.string().optional().describe("Selo curto acima do título, até 30 caracteres."),
        tag: z.string().optional().describe("Etiqueta no canto (ex.: Novo), até 14 caracteres."),
        featured: z.boolean().optional(),
        hidden: z.boolean().optional(),
      }),
      z.object({
        type: z.literal("add_card"),
        after_id: z.string().nullable().describe("Id do bloco anterior; null = no fim."),
        action: z.enum(LINK_ACTIONS),
        title: z.string(),
        subtitle: z.string().optional(),
        icon: z.enum(ICON_IDS).optional().describe("Só para action url."),
        url: z.string().optional().describe("Só para action url: um dos links permitidos."),
      }),
      z.object({
        type: z.literal("add_text"),
        after_id: z.string().nullable(),
        title: z.string().optional(),
        body: z.string().describe("Até 1000 caracteres; linha em branco separa parágrafos."),
      }),
      z.object({
        type: z.literal("update_text"),
        id: z.string(),
        title: z.string().optional(),
        body: z.string().optional(),
      }),
      z.object({ type: z.literal("remove_block"), id: z.string() }),
      z.object({
        type: z.literal("reorder"),
        ids: z.array(z.string()).describe("Todos os ids dos blocos, na nova ordem."),
      }),
      z.object({
        type: z.literal("set_colors"),
        glow1: hexish.optional(),
        glow2: hexish.optional(),
        glow3: hexish.optional(),
        accent: hexish.optional().describe("Cor das categorias do topo (sobre fundo escuro)."),
      }),
    ]),
  ),
});
export type AiEdit = z.infer<typeof aiEditSchema>;
type Edit = AiEdit["edits"][number];

export type AiResult = {
  document: BioDocument;
  summary: string;
  applied: string[];
  skipped: { what: string; why: string }[];
};

const clean = (v: string | undefined) => (v === undefined ? undefined : v.trim());

function describe(e: Edit): string {
  switch (e.type) {
    case "set_profile":
      return "Slogan e categorias";
    case "set_description":
      return "Descrição para busca";
    case "set_ticker":
      return "Faixa de avisos";
    case "update_card":
      return `Cartão “${e.title ?? e.id}”`;
    case "add_card":
      return `Novo cartão “${e.title}”`;
    case "add_text":
      return `Novo texto “${e.title ?? "sem título"}”`;
    case "update_text":
      return `Texto “${e.title ?? e.id}”`;
    case "remove_block":
      return `Remover “${e.id}”`;
    case "reorder":
      return "Ordem dos blocos";
    case "set_colors":
      return "Cores do topo";
  }
}

/** Converte uma alteração da IA em operações do editor (ou explica por que não dá). */
function toOperations(
  doc: BioDocument,
  e: Edit,
  allowedUrls: Set<string>,
): Operation[] | { why: string } {
  const block = (id: string) => doc.blocks.find((b) => b.id === id);
  switch (e.type) {
    case "set_profile":
      return [
        {
          type: "profile",
          patch: {
            ...(e.tagline !== undefined && { tagline: clean(e.tagline) }),
            ...(e.categories && {
              categories: e.categories.map((c) => c.trim().toUpperCase()).filter(Boolean),
            }),
          },
        },
      ];
    case "set_description":
      return [{ type: "meta", patch: { description: e.description.trim() } }];
    case "set_ticker":
      return [
        {
          type: "ticker",
          patch: { enabled: e.enabled, items: e.items.map((i) => i.trim()).filter(Boolean) },
        },
      ];
    case "update_card": {
      const b = block(e.id);
      if (b?.type !== "link") return { why: "cartão não encontrado" };
      const patch: Record<string, unknown> = {};
      for (const k of ["title", "subtitle", "badge", "tag"] as const)
        if (e[k] !== undefined) patch[k] = clean(e[k]);
      if (e.hidden !== undefined) patch.hidden = e.hidden;
      if (e.featured !== undefined) {
        patch.featured = e.featured || undefined;
        patch.featureStyle = e.featured ? "neon" : undefined;
      }
      return [{ type: "block-update", id: e.id, patch }];
    }
    case "add_card": {
      if (e.after_id && !block(e.after_id)) return { why: "posição não encontrada" };
      if (e.action === "url" && !(e.url && allowedUrls.has(e.url)))
        return { why: "link que não está no cadastro (a IA não inventa links)" };
      const card = {
        id: uniqueBlockId(doc, "cartao"),
        type: "link",
        action: e.action,
        title: e.title.trim(),
        hidden: false,
        variant: "solid",
        ...(clean(e.subtitle) && { subtitle: clean(e.subtitle) }),
        ...(e.action === "url" && { url: e.url, icon: e.icon ?? "link" }),
      } as BlockOf<"link">;
      if (!resolveLink(card, doc.contact))
        return { why: "falta o dado de contato deste cartão (preencha na aba Contato)" };
      return [{ type: "block-add", block: card, afterId: e.after_id ?? undefined }];
    }
    case "add_text": {
      if (e.after_id && !block(e.after_id)) return { why: "posição não encontrada" };
      const text: Block = {
        id: uniqueBlockId(doc, "texto"),
        type: "text",
        hidden: false,
        body: e.body.trim(),
        ...(clean(e.title) && { title: clean(e.title) }),
      };
      return [{ type: "block-add", block: text, afterId: e.after_id ?? undefined }];
    }
    case "update_text": {
      if (block(e.id)?.type !== "text") return { why: "texto não encontrado" };
      const patch: Record<string, unknown> = {};
      if (e.title !== undefined) patch.title = clean(e.title);
      if (e.body !== undefined) patch.body = clean(e.body);
      return [{ type: "block-update", id: e.id, patch }];
    }
    case "remove_block":
      if (!block(e.id)) return { why: "bloco não encontrado" };
      return [{ type: "block-remove", id: e.id }];
    case "reorder": {
      const known = new Set(doc.blocks.map((b) => b.id));
      const ids = e.ids.filter((id, i) => known.has(id) && e.ids.indexOf(id) === i);
      if (ids.length === 0) return { why: "nenhum bloco conhecido na lista" };
      return [{ type: "replace", document: reorder(doc, ids) }];
    }
    case "set_colors": {
      const colors = Object.fromEntries(
        (["glow1", "glow2", "glow3", "accent"] as const)
          .filter((k) => e[k] !== undefined)
          .map((k) => [k, e[k]!.trim().toLowerCase()]),
      );
      return [{ type: "theme", patch: { colors } }];
    }
  }
}

/** Blocos listados na ordem pedida; os não listados continuam depois, na ordem atual. */
function reorder(doc: BioDocument, ids: string[]): BioDocument {
  const byId = new Map(doc.blocks.map((b) => [b.id, b]));
  const listed = ids.map((id) => byId.get(id)!);
  const rest = doc.blocks.filter((b) => !ids.includes(b.id));
  return { ...structuredClone(doc), blocks: structuredClone([...listed, ...rest]) };
}

/**
 * Aplica as alterações da IA uma a uma sobre um documento válido. Cada uma só entra se o
 * documento continuar válido (texto longo, contraste, link inventado → descartada com o motivo).
 * No fim, o visual padrão (D38) é reaplicado.
 */
export function applyAiEdits(doc: BioDocument, edit: AiEdit, allowedUrls: Set<string>): AiResult {
  let current = doc;
  const applied: string[] = [];
  const skipped: AiResult["skipped"] = [];
  for (const e of edit.edits) {
    const what = describe(e);
    const ops = toOperations(current, e, allowedUrls);
    if (!Array.isArray(ops)) {
      skipped.push({ what, why: ops.why });
      continue;
    }
    const next = ops.reduce(applyOperation, current);
    const check = validateBio(next);
    if (!check.ok) {
      skipped.push({ what, why: check.issues[0].message });
      continue;
    }
    current = check.document;
    applied.push(what);
  }
  const standard = validateBio(applyStandardLook(current));
  return {
    document: standard.ok ? standard.document : current,
    summary: edit.summary.trim(),
    applied,
    skipped,
  };
}

/** Links que a IA pode usar em cartões novos: os do cadastro e os já presentes no documento. */
export function allowedUrlsOf(doc: BioDocument, extra: (string | undefined)[]): Set<string> {
  const urls = new Set<string>();
  for (const u of extra) if (u) urls.add(u);
  for (const b of doc.blocks) if (b.type === "link" && b.url) urls.add(b.url);
  const c = doc.contact;
  for (const u of [c.googleReviewUrl, c.mapsUrl, c.facebookUrl, c.youtubeUrl]) if (u) urls.add(u);
  return urls;
}
