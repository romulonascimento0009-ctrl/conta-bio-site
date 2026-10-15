"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type Tab = { href: string; label: string };

export const OPERATOR_TABS: Tab[] = [
  { href: "", label: "Dados" },
  { href: "/briefing", label: "Cadastro do cliente" },
  { href: "/imagens", label: "Imagens" },
  { href: "/site", label: "Bio Site" },
  { href: "/editor", label: "Editor visual" },
  { href: "/rapida", label: "Edição rápida" },
  { href: "/versoes", label: "Versões" },
  { href: "/metricas", label: "Métricas" },
  { href: "/acessos", label: "Acessos" },
  { href: "/atividade", label: "Atividade" },
];

export function Tabs({
  base,
  tabs = OPERATOR_TABS,
  label = "Seções do cliente",
}: {
  base: string;
  tabs?: Tab[];
  label?: string;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="mt-4 border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {tabs.map((t) => {
          const href = base + t.href;
          const active = pathname === href;
          return (
            <li key={t.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-2 text-sm whitespace-nowrap ${active ? "border-accent font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
