import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient } from "@/data/clients";
import { EditorView } from "./view";

export const metadata: Metadata = { title: "Editor visual · PlataformaSites" };

export default async function EditorPage({ params }: PageProps<"/admin/clientes/[id]/editor">) {
  const { id } = await params;
  if (!(await getClient(id))) notFound();
  return (
    <EditorView
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
