import type { ReactNode } from "react";
import { listAssets } from "@/data/assets";
import { getClient } from "@/data/clients";
import { getDraft, getSite, hasUnpublishedChanges } from "@/data/sites";
import { aiConfigured } from "@/ai/client";
import { aiSpentThisMonth } from "@/data/ai";
import { env } from "@/lib/env";
import { publicUrl } from "@/lib/public-url";
import { getAccess } from "@/lib/session";
import { Editor, type EditorAsset } from "./editor";

/** Editor visual de um cliente. Usado pelo operador (/admin) e pelo próprio cliente (/painel). */
export async function EditorView({ clientId, noSite }: { clientId: string; noSite: ReactNode }) {
  const client = await getClient(clientId);
  if (!client) return null;
  const [site, draft, assets] = await Promise.all([
    getSite(client.id),
    getDraft(client.id),
    listAssets(client.id),
  ]);
  if (!site || !draft) return noSite;

  const editorAssets: EditorAsset[] = assets.map((a) => ({
    id: a.id,
    width: a.width,
    height: a.height,
    variants: a.variants,
    alt: a.alt,
    name: a.originalName,
  }));

  // IA só para o operador (o cliente edita à mão; gasto controlado pela plataforma).
  const access = await getAccess();
  const ai =
    access?.role === "operator"
      ? {
          configured: aiConfigured(),
          spentMicros: await aiSpentThisMonth(),
          budgetUsd: env().AI_MONTHLY_BUDGET_USD,
        }
      : undefined;

  return (
    <Editor
      clientId={client.id}
      initial={draft}
      assets={editorAssets}
      pending={await hasUnpublishedChanges(site)}
      publishedUrl={site.publishedVersionId ? publicUrl(client.slug) : undefined}
      ai={ai}
    />
  );
}
