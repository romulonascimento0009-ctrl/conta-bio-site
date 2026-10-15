import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getClient } from "@/data/clients";
import { publicUrl } from "@/lib/public-url";
import { ClientForm, DeleteClientForm } from "./client-forms";

export const metadata: Metadata = { title: "Cliente · PlataformaSites" };

export default async function ClientPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <div className="grid gap-12">
      <section aria-labelledby="dados">
        <h2 id="dados" className="text-lg font-semibold">
          Dados do cliente
        </h2>
        <p className="mt-1 text-sm text-muted">
          Endereço público: <span className="font-mono">{publicUrl(client.slug)}</span>
        </p>
        <ClientForm client={client} />
      </section>
      <section aria-labelledby="excluir" className="rounded-md border border-danger/40 p-4">
        <h2 id="excluir" className="text-lg font-semibold text-danger">
          Excluir cliente
        </h2>
        <p className="mt-1 text-sm text-muted">
          Apaga o cliente, o cadastro, o Bio Site, as versões e todas as imagens. Não pode ser
          desfeito.
        </p>
        <DeleteClientForm id={client.id} slug={client.slug} />
      </section>
    </div>
  );
}
