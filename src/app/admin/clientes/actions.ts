"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/admin/_components/form";
import { slugify } from "@/clients/slug";
import { AssetInUse, deleteAsset, updateAssetAlt, uploadAsset } from "@/data/assets";
import { saveBriefing } from "@/data/briefings";
import { createClient, deleteClient, getClient, SlugTaken, updateClient } from "@/data/clients";
import { createSiteFromTemplate, publishDraft, saveDraft, saveQuickEdit } from "@/data/sites";
import { ImageRejected } from "@/media/process";
import { quickEditSchema } from "@/sites/quick-edit";
import { THEMES, type ThemeId } from "@/sites/themes";

// Toda ação chama a camada de dados, que valida a sessão (requireSession) por conta própria.

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
  revalidatePath(`/admin/clientes/${id}`, "layout");
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
  revalidatePath(`/admin/clientes/${id}`, "layout");
  return { ok: true, message: "Briefing salvo." };
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
  revalidatePath(`/admin/clientes/${clientId}/imagens`);
  return { ok: true, message: `${file.name} enviada.` };
}

export async function updateAltAction(
  clientId: string,
  assetId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  await updateAssetAlt(clientId, assetId, str(fd, "alt"));
  revalidatePath(`/admin/clientes/${clientId}/imagens`);
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
  revalidatePath(`/admin/clientes/${clientId}/imagens`);
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
  revalidatePath(`/admin/clientes/${id}`, "layout");
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
  revalidatePath(`/admin/clientes/${id}`, "layout");
  return {
    ok: true,
    message: publish ? "Salvo e publicado." : "Rascunho salvo. Publique quando quiser.",
  };
}

export async function publishAction(id: string, _prev: FormState): Promise<FormState> {
  const published = await publishDraft(id);
  if (!published) return { ok: false, message: "Não foi possível publicar: o rascunho tem erros." };
  revalidatePath(`/admin/clientes/${id}`, "layout");
  return { ok: true, message: "Publicado." };
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
  revalidatePath(`/admin/clientes/${id}`, "layout");
  return { ok: true, message: "Rascunho salvo." };
}
