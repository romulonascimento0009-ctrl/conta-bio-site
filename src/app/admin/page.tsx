import type { Metadata } from "next";
import Link from "next/link";
import { listClients } from "@/data/clients";
import { STATUS_LABEL } from "@/clients/status";

export const metadata: Metadata = { title: "Clientes · PlataformaSites" };

export default async function AdminHome() {
  const clients = await listClients();
  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <Link
          href="/admin/clientes/novo"
          className="rounded-md bg-accent px-4 py-2 font-medium text-white"
        >
          Novo cliente
        </Link>
      </div>

      {clients.length === 0 ? (
        <p className="mt-8 text-muted">Nenhum cliente ainda. Cadastre o primeiro para começar.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Nome
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Endereço
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Situação
                </th>
                <th scope="col" className="py-2 font-medium">
                  Atualizado
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-border">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/admin/clientes/${c.id}`}
                      className="font-medium text-accent underline-offset-4 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="py-3 pr-4 font-mono text-xs">{c.slug}</td>
                  <td className="py-3 pr-4">{STATUS_LABEL[c.status]}</td>
                  <td className="py-3">{c.updatedAt.toLocaleDateString("pt-BR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
