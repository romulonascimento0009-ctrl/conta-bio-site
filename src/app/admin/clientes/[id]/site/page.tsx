import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isSegment, SEGMENTS } from "@/clients/segments";
import { getClient } from "@/data/clients";
import { getSite, hasUnpublishedChanges } from "@/data/sites";
import { publicUrl } from "@/lib/public-url";
import { THEMES } from "@/sites/themes";
import { PublishForm } from "@/app/admin/_components/publish-form";
import { CreateSiteForm, DraftEditor } from "./site-forms";

export const metadata: Metadata = { title: "Bio Site · PlataformaSites" };

export default async function SitePage({ params }: PageProps<"/admin/clientes/[id]/site">) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const site = await getSite(id);

  if (!site) {
    const segment = isSegment(client.segment) ? client.segment : "other";
    const themes = Object.entries(THEMES).map(([themeId, t]) => ({
      id: themeId,
      label: t.label,
      colors: [
        t.theme.colors.cardTop,
        t.theme.colors.cardBottom,
        t.theme.colors.accent,
        t.ticker.bg,
      ],
    }));
    return (
      <section aria-labelledby="criar">
        <h2 id="criar" className="text-lg font-semibold">
          Criar Bio Site
        </h2>
        <p className="mt-1 text-sm text-muted">
          Modelo do segmento <strong>{SEGMENTS[segment].label}</strong>, preenchido com os dados do
          briefing. Tudo pode ser alterado depois.
        </p>
        <CreateSiteForm clientId={id} themes={themes} defaultTheme={SEGMENTS[segment].theme} />
      </section>
    );
  }

  const pending = await hasUnpublishedChanges(site);
  const url = publicUrl(client.slug);

  return (
    <div className="grid gap-10">
      <section aria-labelledby="publicacao" className="rounded-md border border-border p-4">
        <h2 id="publicacao" className="text-lg font-semibold">
          Publicação
        </h2>
        <p className="mt-1 text-sm">
          {site.publishedVersionId ? (
            <>
              Publicado em{" "}
              <a
                href={url}
                target="_blank"
                rel="noopener"
                className="font-mono text-accent underline"
              >
                {url}
              </a>
              {pending
                ? " · há alterações no rascunho ainda não publicadas."
                : " · rascunho e publicado iguais."}
            </>
          ) : (
            "Ainda não publicado."
          )}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
          <div className="flex flex-wrap content-start gap-3">
            <Link
              href={`/admin/clientes/${id}/editor`}
              className="rounded-md bg-accent px-4 py-2 font-semibold text-white"
            >
              Abrir editor visual
            </Link>
            <Link
              href={`/admin/clientes/${id}/rapida`}
              className="rounded-md border border-border bg-white px-4 py-2 font-medium"
            >
              Edição rápida
            </Link>
            <Link
              href={`/preview/${id}`}
              target="_blank"
              className="rounded-md border border-border bg-white px-4 py-2 font-medium"
            >
              Abrir prévia do rascunho
            </Link>
            <Link
              href={`/admin/clientes/${id}/versoes`}
              className="rounded-md border border-border bg-white px-4 py-2 font-medium"
            >
              Histórico de versões
            </Link>
          </div>
          <PublishForm clientId={id} pending={pending} />
        </div>
      </section>

      <section aria-labelledby="avancado">
        <h2 id="avancado" className="text-lg font-semibold">
          Edição avançada (JSON)
        </h2>
        <p className="mt-1 text-sm text-muted">
          Para ajustes que ainda não estão na edição rápida (cores, blocos, ordem). Validado antes
          de salvar. O editor visual chega na Fase 3. Imagens: use o id exibido na aba Imagens.
        </p>
        <DraftEditor clientId={id} initial={JSON.stringify(site.draft, null, 2)} />
      </section>
    </div>
  );
}
