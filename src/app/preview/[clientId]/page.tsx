import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDraftForPreview } from "@/data/sites";
import { getVersionForPreview } from "@/data/versions";
import { requireAccess } from "@/lib/session";
import { BioRenderer } from "@/sites/render/BioRenderer";

export const metadata: Metadata = {
  title: "Prévia",
  robots: { index: false, follow: false },
};

/** Prévia do rascunho (ou de uma versão, com ?versao=<id>) em página inteira. Exige acesso ao cliente. */
export default async function PreviewPage({
  params,
  searchParams,
}: PageProps<"/preview/[clientId]">) {
  // Operador: qualquer cliente; cliente: só o próprio (a camada de dados confere → 404).
  await requireAccess();
  const { clientId } = await params;
  const { versao } = await searchParams;
  const site =
    typeof versao === "string"
      ? await getVersionForPreview(clientId, versao)
      : await getDraftForPreview(clientId);
  if (!site) notFound();
  return <BioRenderer doc={site.document} assets={site.assets} />;
}
