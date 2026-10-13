import type { Metadata } from "next";

export const metadata: Metadata = { title: "Painel · PlataformaSites" };

export default function AdminHome() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Painel</h1>
      <p className="mt-2 text-muted">Nenhum cliente cadastrado ainda.</p>
    </>
  );
}
