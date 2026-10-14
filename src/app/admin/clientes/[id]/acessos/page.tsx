import type { Metadata } from "next";
import { INVITE_STATUS_LABEL } from "@/clients/invites";
import { listInvites, listMembers } from "@/data/access";
import { InviteForm, RemoveMemberForm, RevokeInviteForm } from "./access-forms";

export const metadata: Metadata = { title: "Acessos · PlataformaSites" };

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

export default async function AccessPage({ params }: PageProps<"/admin/clientes/[id]/acessos">) {
  const { id } = await params;
  const [members, invites] = await Promise.all([listMembers(id), listInvites(id)]);

  return (
    <div className="grid gap-10">
      <section aria-labelledby="convidar">
        <h2 id="convidar" className="text-lg font-semibold">
          Convidar o cliente
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          O convite gera um link de uso único. Quem abrir o link cria a própria senha e passa a
          editar e publicar só o Bio Site desta empresa, sem acesso aos dados de outros clientes.
        </p>
        <InviteForm clientId={id} />
      </section>

      <section aria-labelledby="pessoas">
        <h2 id="pessoas" className="text-lg font-semibold">
          Pessoas com acesso ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Ninguém da empresa tem acesso ainda.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {members.map((m) => (
              <li
                key={m.userId}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-4"
              >
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted">
                    {m.email}, desde{" "}
                    <time dateTime={m.since.toISOString()}>{fmt.format(m.since)}</time>
                  </p>
                </div>
                <RemoveMemberForm clientId={id} userId={m.userId} email={m.email} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="convites">
        <h2 id="convites" className="text-lg font-semibold">
          Convites enviados
        </h2>
        {invites.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Nenhum convite ainda.</p>
        ) : (
          <div
            className="mt-4 overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-labelledby="convites"
          >
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border text-muted">
                <tr>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    E-mail
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Situação
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Válido até
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => (
                  <tr key={inv.id} className="border-b border-border">
                    <td className="py-3 pr-4">{inv.email}</td>
                    <td className="py-3 pr-4">{INVITE_STATUS_LABEL[inv.status]}</td>
                    <td className="py-3 pr-4">
                      <time dateTime={inv.expiresAt.toISOString()}>
                        {fmt.format(inv.expiresAt)}
                      </time>
                    </td>
                    <td className="py-3">
                      {inv.status === "pending" && (
                        <RevokeInviteForm clientId={id} inviteId={inv.id} email={inv.email} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
