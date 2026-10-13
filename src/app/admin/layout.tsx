import { requireSession } from "@/lib/session";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await requireSession();

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-semibold">PlataformaSites</span>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">{session.user.email}</span>
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
