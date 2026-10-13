import type { Metadata } from "next";
import Link from "next/link";
import { getDraft } from "@/data/sites";
import { quickValuesFrom } from "@/sites/quick-edit";
import { QuickEditForm } from "./quick-edit-form";

export const metadata: Metadata = { title: "Edição rápida · PlataformaSites" };

export default async function QuickEditPage({ params }: PageProps<"/admin/clientes/[id]/rapida">) {
  const { id } = await params;
  const draft = await getDraft(id);

  if (!draft) {
    return (
      <p className="text-muted">
        Este cliente ainda não tem Bio Site.{" "}
        <Link href={`/admin/clientes/${id}/site`} className="text-accent underline">
          Criar agora
        </Link>
        .
      </p>
    );
  }

  return (
    <section aria-labelledby="rapida">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rapida" className="text-lg font-semibold">
          Edição rápida
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
        Altere o que precisar e toque em <strong>Salvar e publicar</strong>. Campos vazios escondem
        o cartão correspondente.
      </p>
      <QuickEditForm clientId={id} initial={quickValuesFrom(draft)} />
    </section>
  );
}
