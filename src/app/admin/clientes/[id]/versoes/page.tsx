import type { Metadata } from "next";
import { VersionsView } from "./view";

export const metadata: Metadata = { title: "Versões · PlataformaSites" };

export default async function VersionsPage({ params }: PageProps<"/admin/clientes/[id]/versoes">) {
  const { id } = await params;
  return <VersionsView clientId={id} />;
}
