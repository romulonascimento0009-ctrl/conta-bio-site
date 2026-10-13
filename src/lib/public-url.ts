import { env } from "@/lib/env";

/** Endereço público de um Bio Site: <PUBLIC_URL>/<slug>. */
export function publicUrl(slug: string): string {
  return `${env().PUBLIC_URL.replace(/\/+$/, "")}/${slug}`;
}
