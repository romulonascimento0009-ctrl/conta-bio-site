import type { Metadata } from "next";
import { VersionsView } from "@/app/admin/clientes/[id]/versoes/view";
import { requireClientUser } from "@/lib/session";

export const metadata: Metadata = { title: "Versões · Meu Bio Site" };

export default async function Page() {
  const { clientId } = await requireClientUser();
  return <VersionsView clientId={clientId} />;
}
