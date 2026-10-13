"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/app/admin/_components/form";
import { slugify } from "@/clients/slug";
import { AssetInUse, deleteAsset, updateAssetAlt, uploadAsset } from "@/data/assets";
import { saveBriefing } from "@/data/briefings";
import { createClient, deleteClient, getClient, SlugTaken, updateClient } from "@/data/clients";
import { createSiteFromPreset, MissingBookingTarget, saveDraft } from "@/data/sites";
import { requireSession } from "@/lib/session";
import { ImageRejected } from "@/media/process";
import { THEME_PRESETS, type ThemePresetId } from "@/sites/presets";

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
    id = (await createClient({ name, slug })).id;
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
  await requireSession();
  const presetId = str(fd, "preset");
  if (!Object.hasOwn(THEME_PRESETS, presetId)) return { ok: false, message: "Escolha um tema." };
  try {
    await createSiteFromPreset(id, presetId as ThemePresetId);
  } catch (err) {
    if (err instanceof MissingBookingTarget) return { ok: false, message: err.message };
    throw err;
  }
  revalidatePath(`/admin/clientes/${id}`, "layout");
  return { ok: true, message: "Site criado." };
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
