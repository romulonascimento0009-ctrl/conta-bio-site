import type { Metadata } from "next";
import { ImagesView } from "./view";

export const metadata: Metadata = { title: "Imagens · PlataformaSites" };

export default async function ImagesPage({ params }: PageProps<"/admin/clientes/[id]/imagens">) {
  const { id } = await params;
  return <ImagesView clientId={id} />;
}
