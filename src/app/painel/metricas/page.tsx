import type { Metadata } from "next";
import { MetricsView, parsePeriod } from "@/app/admin/clientes/[id]/metricas/view";
import { requireClientUser } from "@/lib/session";

export const metadata: Metadata = { title: "Métricas · Meu Bio Site" };

export default async function Page({ searchParams }: PageProps<"/painel/metricas">) {
  const { clientId } = await requireClientUser();
  const { dias } = await searchParams;
  return <MetricsView clientId={clientId} basePath="/painel/metricas" period={parsePeriod(dias)} />;
}
