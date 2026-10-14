import { notFound } from "next/navigation";
import { signOut } from "@/app/admin/actions";
import { Tabs, type Tab } from "@/app/admin/clientes/[id]/tabs";
import { getClient } from "@/data/clients";
import { getSite } from "@/data/sites";
import { publicUrl } from "@/lib/public-url";
import { requireClientUser } from "@/lib/session";

const CLIENT_TABS: Tab[] = [
  { href: "", label: "Editor visual" },
  { href: "/rapida", label: "Edição rápida" },
  { href: "/imagens", label: "Imagens" },
  { href: "/versoes", label: "Versões" },
];

/** Área do cliente: só o próprio Bio Site (operador que abrir /painel vai para /admin). */
export default async function ClientAreaLayout({ children }: LayoutProps<"/painel">) {
  const access = await requireClientUser();
  const client = await getClient(access.clientId);
  if (!client) notFound();
  const site = await getSite(client.id);

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="font-semibold">{client.name}</span>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {site?.publishedVersionId && (
            <a
              href={publicUrl(client.slug)}
              target="_blank"
              rel="noopener"
              className="text-accent underline-offset-4 hover:underline"
            >
              Ver meu Bio Site
            </a>
          )}
          <span className="text-muted">{access.email}</span>
          <form action={signOut}>
            <button type="submit" className="rounded-md border border-border px-3 py-1">
              Sair
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-6">
        <Tabs base="/painel" tabs={CLIENT_TABS} label="Seções do meu Bio Site" />
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}
