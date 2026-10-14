import type { Metadata } from "next";
import { QuickEditView } from "@/app/admin/clientes/[id]/rapida/view";
import { requireClientUser } from "@/lib/session";
import { NoSiteYet } from "../no-site";

export const metadata: Metadata = { title: "Edição rápida · Meu Bio Site" };

export default async function Page() {
  const { clientId } = await requireClientUser();
  return <QuickEditView clientId={clientId} noSite={<NoSiteYet />} />;
}
