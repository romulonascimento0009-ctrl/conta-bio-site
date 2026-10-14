import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/data/clients";
import { STATUS_LABEL } from "@/clients/status";
import { requireOperator } from "@/lib/session";
import { Tabs } from "./tabs";

export default async function ClientLayout({
  children,
  params,
}: LayoutProps<"/admin/clientes/[id]">) {
  await requireOperator();
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin" className="text-sm text-accent underline-offset-4 hover:underline">
        ← Clientes
      </Link>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-semibold">{client.name}</h1>
        <span className="text-sm text-muted">{STATUS_LABEL[client.status]}</span>
      </div>
      <Tabs base={`/admin/clientes/${client.id}`} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
