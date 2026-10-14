import type { Metadata } from "next";
import { ImagesView } from "@/app/admin/clientes/[id]/imagens/view";
import { requireClientUser } from "@/lib/session";

export const metadata: Metadata = { title: "Imagens · Meu Bio Site" };

export default async function Page() {
  const { clientId } = await requireClientUser();
  return <ImagesView clientId={clientId} />;
}
