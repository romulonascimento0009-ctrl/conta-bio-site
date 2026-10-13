import type { Metadata } from "next";
import Link from "next/link";
import { getSite } from "@/data/sites";
import { THEME_PRESETS } from "@/sites/presets";
import { CreateSiteForm, DraftEditor } from "./site-forms";

export const metadata: Metadata = { title: "Site · PlataformaSites" };

export default async function SitePage({ params }: PageProps<"/admin/clientes/[id]/site">) {
  const { id } = await params;
  const site = await getSite(id);

  if (!site) {
    const presets = Object.entries(THEME_PRESETS).map(([presetId, p]) => ({
      id: presetId,
      label: p.label,
      colors: Object.values(p.theme.colors),
    }));
    return (
      <section aria-labelledby="criar">
        <h2 id="criar" className="text-lg font-semibold">
          Criar site
        </h2>
        <p className="mt-1 text-sm text-muted">
          Escolha um tema inicial. O conteúdo vem do briefing e pode ser editado depois.
        </p>
        <CreateSiteForm clientId={id} presets={presets} />
      </section>
    );
  }

  return (
    <section aria-labelledby="rascunho">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rascunho" className="text-lg font-semibold">
          Rascunho
        </h2>
        <Link
          href={`/preview/${id}`}
          target="_blank"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium"
        >
          Abrir prévia
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        Edição provisória em JSON, validada antes de salvar. O editor visual chega na Fase 3.
        Imagens: use o id exibido na aba Imagens.
      </p>
      <DraftEditor clientId={id} initial={JSON.stringify(site.draft, null, 2)} />
    </section>
  );
}
