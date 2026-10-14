import type { Metadata } from "next";
import { EditorView } from "@/app/admin/clientes/[id]/editor/view";
import { requireClientUser } from "@/lib/session";
import { NoSiteYet } from "./no-site";

export const metadata: Metadata = { title: "Editor visual · Meu Bio Site" };

export default async function Page() {
  const { clientId } = await requireClientUser();
  return <EditorView clientId={clientId} noSite={<NoSiteYet />} />;
}
