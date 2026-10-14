import Link from "next/link";
import type { ReactNode } from "react";
import { getDraft } from "@/data/sites";
import { quickValuesFrom } from "@/sites/quick-edit";
import { QuickEditForm } from "./quick-edit-form";

/** Edição rápida. Usada pelo operador (/admin) e pelo próprio cliente (/painel). */
export async function QuickEditView({ clientId, noSite }: { clientId: string; noSite: ReactNode }) {
  const draft = await getDraft(clientId);
  if (!draft) return noSite;

  return (
    <section aria-labelledby="rapida">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="rapida" className="text-lg font-semibold">
          Edição rápida
        </h2>
        <Link
          href={`/preview/${clientId}`}
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
      <QuickEditForm clientId={clientId} initial={quickValuesFrom(draft)} />
    </section>
  );
}
