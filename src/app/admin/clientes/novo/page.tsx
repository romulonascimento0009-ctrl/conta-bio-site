import type { Metadata } from "next";
import { NewClientForm } from "./new-client-form";

export const metadata: Metadata = { title: "Novo cliente · PlataformaSites" };

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">Novo cliente</h1>
      <NewClientForm />
    </div>
  );
}
