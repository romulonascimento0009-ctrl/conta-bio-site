import { requireOperator } from "@/lib/session";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  // Cliente que tentar /admin vai para /painel.
  const operator = await requireOperator();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-semibold">PlataformaSites</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">{operator.email}</span>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-border px-3 py-1">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="px-4 py-6">{children}</main>
    </div>
  );
}
