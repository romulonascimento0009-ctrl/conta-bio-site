import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDraftForPreview } from "@/data/sites";
import { requireSession } from "@/lib/session";
import { SiteRenderer } from "@/sites/render/SiteRenderer";

export const metadata: Metadata = {
  title: "Prévia do rascunho",
  robots: { index: false, follow: false },
};

/** Prévia do rascunho em página inteira (sem a moldura do painel). Exige sessão. */
export default async function PreviewPage({ params }: PageProps<"/preview/[clientId]">) {
  await requireSession();
  const { clientId } = await params;
  const site = await getDraftForPreview(clientId);
  if (!site) notFound();
  return <SiteRenderer doc={site.document} assets={site.assets} />;
}
