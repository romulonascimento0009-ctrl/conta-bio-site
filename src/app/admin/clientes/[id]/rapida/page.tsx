import type { Metadata } from "next";
import Link from "next/link";
import { QuickEditView } from "./view";

export const metadata: Metadata = { title: "Edição rápida · PlataformaSites" };

export default async function QuickEditPage({ params }: PageProps<"/admin/clientes/[id]/rapida">) {
  const { id } = await params;
  return (
    <QuickEditView
      clientId={id}
      noSite={
        <p className="text-muted">
          Este cliente ainda não tem Bio Site.{" "}
          <Link href={`/admin/clientes/${id}/site`} className="text-accent underline">
            Criar agora
          </Link>
          .
        </p>
      }
    />
  );
}
