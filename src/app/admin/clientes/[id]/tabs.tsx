"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "", label: "Dados" },
  { href: "/briefing", label: "Briefing" },
  { href: "/imagens", label: "Imagens" },
  { href: "/site", label: "Site" },
];

export function Tabs({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Seções do cliente" className="mt-4 border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const href = base + t.href;
          const active = pathname === href;
          return (
            <li key={t.label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`block border-b-2 px-3 py-2 text-sm ${active ? "border-accent font-medium text-foreground" : "border-transparent text-muted hover:text-foreground"}`}
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
