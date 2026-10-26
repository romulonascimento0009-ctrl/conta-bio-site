"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/admin/_components/form";
import { slugify } from "@/clients/slug";
import { createInvite, EmailTaken, removeMember, revokeInvite } from "@/data/access";
import { AssetInUse, deleteAsset, updateAssetAlt, uploadAsset } from "@/data/assets";
import { requestAiEdit, type AiEditResult } from "@/data/ai";
import { saveBriefing } from "@/data/briefings";
import { createClient, deleteClient, getClient, SlugTaken, updateClient } from "@/data/clients";
import { createSiteFromTemplate, publishDraft, saveDraft, saveQuickEdit } from "@/data/sites";
import { publishVersion, restoreVersion } from "@/data/versions";
import {
  deleteVideo,
  finishVideoUpload,
  startVideoUpload,
  uploadVideoPart,
  VideoInUse,
  type VideoStart,
} from "@/data/videos";
import { ImageRejected } from "@/media/process";
import { VideoRejected } from "@/media/video";
import { quickEditSchema } from "@/sites/quick-edit";
import { THEMES, type ThemeId } from "@/sites/themes";

// Toda ação chama a camada de dados, que confere o acesso por conta própria: o operador acessa
// qualquer cliente; o usuário cliente, só o próprio (getClient). As exclusivas do operador
// chamam requireOperator() lá dentro. O editor, a edição rápida, as imagens e as versões são
// usados pelas duas áreas (/admin e /painel).

/** Atualiza as telas do cliente nas duas áreas. */
function refresh(clientId: string) {
  revalidatePath(`/admin/clientes/${clientId}`, "layout");
  revalidatePath("/painel", "layout");
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "");

/** Campos de texto enviados (ignora os campos internos `$ACTION_*` do Next). */
function textValues(fd: FormData): Record<string, string> {
  return Object.fromEntries(
    [...fd.entries()].filter(([k, v]) => !k.startsWith("$") && typeof v === "string") as [
      string,
      string,
    ][],
  );
}

function invalid(err: z.ZodError, fd: FormData): FormState {
  return {
    ok: false,
    message: "Corrija os campos destacados.",
    fieldErrors: z.flattenError(err).fieldErrors,
    values: textValues(fd),
  };
}

export async function createClientAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const slug = str(fd, "slug") || slugify(name);
  let id: string;
  try {
    id = (await createClient({ name, slug, segment: str(fd, "segment") as never })).id;
  } catch (err) {
    if (err instanceof z.ZodError) return invalid(err, fd);
    if (err instanceof SlugTaken) {
      return { ok: false, fieldErrors: { slug: [err.message] }, values: textValues(fd) };
    }
    throw err;
  }
  redirect(`/admin/clientes/${id}/briefing`);
}

export async function updateClientAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    const updated = await updateClient(id, {
      name: str(fd, "name"),
      slug: str(fd, "slug"),
      segment: str(fd, "segment") as never,
      status: str(fd, "status") as never,
      notes: str(fd, "notes"),
    });
    if (!updated) return { ok: false, message: "Cliente não encontrado." };
  } catch (err) {
    if (err instanceof z.ZodError) return invalid(err, fd);
    if (err instanceof SlugTaken) {
      return { ok: false, fieldErrors: { slug: [err.message] }, values: textValues(fd) };
    }
    throw err;
  }
  refresh(id);
  return { ok: true, message: "Dados salvos." };
}

export async function deleteClientAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const client = await getClient(id);
  if (!client) return { ok: false, message: "Cliente não encontrado." };
  if (str(fd, "confirm").trim() !== client.slug) {
    return {
      ok: false,
      fieldErrors: { confirm: [`Digite exatamente "${client.slug}" para confirmar.`] },
    };
  }
  await deleteClient(id);
  revalidatePath("/admin");
  redirect("/admin");
}

export async function saveBriefingAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  try {
    await saveBriefing(id, textValues(fd));
  } catch (err) {
    if (err instanceof z.ZodError) return invalid(err, fd);
    throw err;
  }
  refresh(id);
  return { ok: true, message: "Cadastro salvo." };
}

/** Recebe uma imagem por chamada (o navegador já a reduziu). */
export async function uploadAssetAction(clientId: string, fd: FormData): Promise<FormState> {
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, message: "Nenhum arquivo enviado." };
  try {
    await uploadAsset(clientId, file, str(fd, "alt"));
  } catch (err) {
    if (err instanceof ImageRejected) return { ok: false, message: `${file.name}: ${err.message}` };
    throw err;
  }
  refresh(clientId);
  return { ok: true, message: `${file.name} enviada.` };
}

/**
 * Vídeo (D50): o navegador confere o vídeo e tira a capa, depois envia em partes de 3 MB
 * (cada envio passa por uma função com limite de tamanho) e termina com a capa.
 */
export async function startVideoUploadAction(
  clientId: string,
  meta: VideoStart,
): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  try {
    return { ok: true, id: await startVideoUpload(clientId, meta) };
  } catch (err) {
    if (err instanceof VideoRejected) return { ok: false, message: err.message };
    throw err;
  }
}

export async function uploadVideoPartAction(
  clientId: string,
  videoId: string,
  index: number,
  fd: FormData,
): Promise<FormState> {
  const part = fd.get("part");
  if (!(part instanceof Blob)) return { ok: false, message: "Parte do vídeo não enviada." };
  try {
    await uploadVideoPart(clientId, videoId, index, new Uint8Array(await part.arrayBuffer()));
  } catch (err) {
    if (err instanceof VideoRejected) return { ok: false, message: err.message };
    throw err;
  }
  return { ok: true };
}

export async function finishVideoUploadAction(
  clientId: string,
  videoId: string,
  fd: FormData,
): Promise<FormState> {
  const poster = fd.get("poster");
  if (!(poster instanceof File)) return { ok: false, message: "Capa do vídeo não enviada." };
  try {
    const video = await finishVideoUpload(clientId, videoId, poster);
    refresh(clientId);
    return { ok: true, message: `${video.originalName} enviado.` };
  } catch (err) {
    if (err instanceof VideoRejected || err instanceof ImageRejected)
      return { ok: false, message: err.message };
    throw err;
  }
}

export async function deleteVideoAction(
  clientId: string,
  videoId: string,
  _prev: FormState,
): Promise<FormState> {
  try {
    await deleteVideo(clientId, videoId);
  } catch (err) {
    if (err instanceof VideoInUse) return { ok: false, message: err.message };
    throw err;
  }
  refresh(clientId);
  return { ok: true, message: "Vídeo excluído." };
}

export async function updateAltAction(
  clientId: string,
  assetId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await updateAssetAlt(clientId, assetId, str(fd, "alt"));
  refresh(clientId);
  return { ok: true, message: "Descrição salva." };
}

export async function deleteAssetAction(
  clientId: string,
  assetId: string,
  _prev: FormState,
): Promise<FormState> {
  try {
    await deleteAsset(clientId, assetId);
  } catch (err) {
    if (err instanceof AssetInUse) return { ok: false, message: err.message };
    throw err;
  }
  refresh(clientId);
  return { ok: true, message: "Imagem excluída." };
}

export async function createSiteAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const themeId = str(fd, "theme");
  if (!Object.hasOwn(THEMES, themeId)) return { ok: false, message: "Escolha um tema." };
  await createSiteFromTemplate(id, themeId as ThemeId);
  refresh(id);
  return { ok: true, message: "Bio Site criado." };
}

/** Caminho de um erro do documento → campo da edição rápida (para destacar o campo certo). */
function quickFieldFor(path: string): string | undefined {
  if (path.startsWith("ticker.colors")) return "tickerFg";
  if (path.startsWith("ticker.items")) return "tickerItems";
  const contact = /^contact\.(\w+)/.exec(path)?.[1];
  return contact;
}

export async function quickEditAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const values = textValues(fd);
  const parsed = quickEditSchema.safeParse({
    ...values,
    tickerEnabled: fd.get("tickerEnabled") === "on",
    tickerCustomColors: fd.get("tickerCustomColors") === "on",
  });
  if (!parsed.success) return invalid(parsed.error, fd);

  const result = await saveQuickEdit(id, parsed.data);
  if (!result.ok) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.issues) {
      const field = quickFieldFor(issue.path);
      if (field) fieldErrors[field] = [issue.message];
    }
    return {
      ok: false,
      message: `Não salvo: ${result.issues[0].message}`,
      fieldErrors,
      values,
    };
  }

  const publish = fd.get("intent") === "publish";
  if (publish) await publishDraft(id, "Edição rápida");
  refresh(id);
  return {
    ok: true,
    message: publish ? "Salvo e publicado." : "Rascunho salvo. Publique quando quiser.",
  };
}

/** Publicação exige aprovação explícita (caixa "Revisei a prévia e aprovo"). */
export async function publishAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (fd.get("approve") !== "on") {
    return { ok: false, message: "Marque “Revisei a prévia e aprovo a publicação” para publicar." };
  }
  const published = await publishDraft(id, str(fd, "note").trim() || "Publicação");
  if (!published) return { ok: false, message: "Não foi possível publicar: o rascunho tem erros." };
  refresh(id);
  return { ok: true, message: "Publicado." };
}

export type EditorSaveResult = {
  ok: boolean;
  message: string;
  issues?: { path: string; message: string }[];
};

/** Salva o rascunho vindo do editor visual (o servidor valida de novo). */
export async function saveEditorAction(id: string, doc: unknown): Promise<EditorSaveResult> {
  const result = await saveDraft(id, doc);
  if (!result.ok)
    return { ok: false, message: "Não salvo: corrija os itens indicados.", issues: result.issues };
  refresh(id);
  return { ok: true, message: "Rascunho salvo." };
}

/**
 * IA (só operador): devolve uma proposta sobre o documento do editor, sem salvar. O operador
 * vê a prévia e decide aplicar no rascunho.
 */
export async function aiEditAction(
  id: string,
  mode: "generate" | "request",
  doc: unknown,
  request: string,
): Promise<AiEditResult> {
  return requestAiEdit(id, mode === "generate" ? "generate" : "request", doc, String(request));
}

export async function restoreVersionAction(
  clientId: string,
  versionId: string,
  _prev: FormState,
): Promise<FormState> {
  const ok = await restoreVersion(clientId, versionId);
  if (!ok) return { ok: false, message: "Não foi possível restaurar esta versão." };
  refresh(clientId);
  return {
    ok: true,
    message: "Versão copiada para o rascunho. O rascunho anterior foi guardado no histórico.",
  };
}

export async function publishVersionAction(
  clientId: string,
  versionId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (fd.get("approve") !== "on") {
    return { ok: false, message: "Marque a aprovação para republicar esta versão." };
  }
  const ok = await publishVersion(clientId, versionId);
  if (!ok) return { ok: false, message: "Não foi possível publicar esta versão." };
  refresh(clientId);
  return { ok: true, message: "Esta versão está publicada." };
}

export async function saveDraftAction(
  id: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const values = { document: str(fd, "document") };
  let json: unknown;
  try {
    json = JSON.parse(values.document);
  } catch (err) {
    return { ok: false, message: `JSON inválido: ${(err as Error).message}`, values };
  }
  const result = await saveDraft(id, json);
  if (!result.ok) {
    const list = result.issues.slice(0, 8).map((i) => `• ${i.path || "(documento)"}: ${i.message}`);
    return { ok: false, message: `Não salvo. Corrija:\n${list.join("\n")}`, values };
  }
  refresh(id);
  return { ok: true, message: "Rascunho salvo." };
}

// ── Acessos (só operador; a camada de dados confere) ─────────────────────────

export type InviteFormState = FormState & { link?: string; expiresAt?: string };

export async function createInviteAction(
  clientId: string,
  _prev: InviteFormState,
  fd: FormData,
): Promise<InviteFormState> {
  let created: { link: string; expiresAt: Date };
  try {
    created = await createInvite(clientId, { email: str(fd, "email"), days: str(fd, "days") });
  } catch (err) {
    if (err instanceof z.ZodError) return invalid(err, fd);
    if (err instanceof EmailTaken) {
      return { ok: false, fieldErrors: { email: [err.message] }, values: textValues(fd) };
    }
    throw err;
  }
  refresh(clientId);
  return {
    ok: true,
    message: "Convite criado. Copie o link e envie ao cliente.",
    link: created.link,
    expiresAt: created.expiresAt.toISOString(),
  };
}

export async function revokeInviteAction(
  clientId: string,
  inviteId: string,
  _prev: FormState,
): Promise<FormState> {
  const ok = await revokeInvite(clientId, inviteId);
  refresh(clientId);
  return ok
    ? { ok: true, message: "Convite cancelado." }
    : { ok: false, message: "Este convite não pode mais ser cancelado." };
}

export async function removeMemberAction(
  clientId: string,
  userId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  if (fd.get("confirm") !== "on") {
    return { ok: false, message: "Marque a confirmação para remover o acesso." };
  }
  const ok = await removeMember(clientId, userId);
  refresh(clientId);
  return ok
    ? { ok: true, message: "Acesso removido." }
    : { ok: false, message: "Não foi possível remover este acesso." };
}
