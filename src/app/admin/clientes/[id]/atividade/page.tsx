import type { Metadata } from "next";
import { ROLE_LABEL, type Role } from "@/clients/access";
import { AUDIT_ACTIONS, listAudit, type AuditEntry } from "@/data/audit";

export const metadata: Metadata = { title: "Atividade · PlataformaSites" };

const fmt = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Complemento legível de cada registro (partes alteradas, nota, e-mail, arquivo). */
function detail(e: AuditEntry): string | undefined {
  const d = e.details;
  if (Array.isArray(d.parts)) {
    return `${typeof d.source === "string" ? `${d.source}: ` : ""}${d.parts.join(", ")}`;
  }
  for (const key of ["note", "email", "name"]) {
    const v = d[key];
    if (typeof v === "string" && v) return v;
  }
  return undefined;
}

export default async function ActivityPage({
  params,
}: PageProps<"/admin/clientes/[id]/atividade">) {
  const { id } = await params;
  const entries = await listAudit(id);

  return (
    <section aria-labelledby="atividade">
      <h2 id="atividade" className="text-lg font-semibold">
        Atividade
      </h2>
      <p className="mt-1 text-sm text-muted">
        Quem alterou, publicou ou deu acesso a este Bio Site, da ação mais recente para a mais
        antiga.
      </p>
      {entries.length === 0 ? (
        <p className="mt-6 text-muted">Nenhuma atividade registrada ainda.</p>
      ) : (
        <div
          className="mt-6 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-labelledby="atividade"
        >
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Quando
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Quem
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  O quê
                </th>
                <th scope="col" className="py-2 font-medium">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-border align-top">
                  <td className="py-3 pr-4 whitespace-nowrap">
                    <time dateTime={e.createdAt.toISOString()}>{fmt.format(e.createdAt)}</time>
                  </td>
                  <td className="py-3 pr-4">
                    {e.actorEmail}
                    <span className="block text-xs text-muted">
                      {ROLE_LABEL[e.actorRole as Role] ?? e.actorRole}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {AUDIT_ACTIONS[e.action as keyof typeof AUDIT_ACTIONS] ?? e.action}
                  </td>
                  <td className="py-3 text-muted">{detail(e)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
