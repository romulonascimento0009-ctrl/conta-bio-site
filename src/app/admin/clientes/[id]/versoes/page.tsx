import type { Metadata } from "next";
import Link from "next/link";
import { listVersions } from "@/data/versions";
import { VersionActions } from "./version-actions";

export const metadata: Metadata = { title: "Versões · PlataformaSites" };

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function VersionsPage({ params }: PageProps<"/admin/clientes/[id]/versoes">) {
  const { id } = await params;
  const versions = await listVersions(id);

  return (
    <section aria-labelledby="versoes">
      <h2 id="versoes" className="text-lg font-semibold">
        Histórico de versões
      </h2>
      <p className="mt-1 text-sm text-muted">
        Cada publicação cria uma versão. Restaurar copia a versão para o rascunho (o rascunho atual
        é guardado antes). Republicar volta o endereço público para a versão escolhida.
      </p>
      {versions.length === 0 ? (
        <p className="mt-6 text-muted">
          Nenhuma versão ainda. Publique o Bio Site para criar a primeira.
        </p>
      ) : (
        <ol className="mt-6 grid gap-3">
          {versions.map((v) => (
            <li key={v.id} className="rounded-md border border-border p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {v.note || "Sem nota"}
                    {v.published && (
                      <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-900">
                        Publicada
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">
                    <time dateTime={v.createdAt.toISOString()}>{fmt.format(v.createdAt)}</time>
                  </p>
                </div>
                <Link
                  href={`/preview/${id}?versao=${v.id}`}
                  target="_blank"
                  className="rounded-md border border-border px-3 py-1.5 text-sm font-medium"
                >
                  Ver esta versão
                </Link>
              </div>
              <VersionActions clientId={id} versionId={v.id} published={v.published} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
