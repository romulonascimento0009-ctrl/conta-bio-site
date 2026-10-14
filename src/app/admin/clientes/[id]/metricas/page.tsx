import type { Metadata } from "next";
import { MetricsView, parsePeriod } from "./view";

export const metadata: Metadata = { title: "Métricas · PlataformaSites" };

export default async function MetricsPage({
  params,
  searchParams,
}: PageProps<"/admin/clientes/[id]/metricas">) {
  const { id } = await params;
  const { dias } = await searchParams;
  return (
    <MetricsView
      clientId={id}
      basePath={`/admin/clientes/${id}/metricas`}
      period={parsePeriod(dias)}
    />
  );
}
