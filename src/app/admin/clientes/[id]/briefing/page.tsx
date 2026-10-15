import type { Metadata } from "next";
import { getBriefing } from "@/data/briefings";
import { getClient } from "@/data/clients";
import { notFound } from "next/navigation";
import { BriefingForm } from "./briefing-form";

export const metadata: Metadata = { title: "Cadastro do cliente · PlataformaSites" };

export default async function BriefingPage({ params }: PageProps<"/admin/clientes/[id]/briefing">) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const briefing = await getBriefing(id);
  return (
    <section aria-labelledby="briefing">
      <h2 id="briefing" className="text-lg font-semibold">
        Cadastro do cliente
      </h2>
      <p className="mt-1 text-sm text-muted">
        Informações coletadas com o cliente. WhatsApp ou link de agendamento são necessários para
        criar o site.
      </p>
      <BriefingForm clientId={id} initial={briefing ?? { businessName: client.name }} />
    </section>
  );
}
