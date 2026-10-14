import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { homeFor } from "@/clients/access";
import { getAccess, getSession } from "@/lib/session";
import { signOut } from "@/app/admin/actions";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar · PlataformaSites" };

export default async function LoginPage() {
  const access = await getAccess();
  if (access) redirect(homeFor(access));
  // Sessão válida sem papel (ex.: acesso removido enquanto estava conectado).
  const orphan = !access && (await getSession());

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Entrar</h1>
      {orphan ? (
        <div className="grid gap-4">
          <p>Esta conta não tem acesso a nenhum Bio Site. Fale com quem te convidou.</p>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-border px-4 py-2">
              Sair e entrar com outra conta
            </button>
          </form>
        </div>
      ) : (
        <LoginForm />
      )}
    </main>
  );
}
