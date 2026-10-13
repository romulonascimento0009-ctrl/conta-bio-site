import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · PlataformaSites" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Entrar no painel</h1>
      <LoginForm />
    </main>
  );
}
