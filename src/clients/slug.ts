import { z } from "zod";

/**
 * Endereços que nunca podem ser de cliente: rotas do próprio sistema em `dominio.com/<slug>`
 * (atuais e previstas) e nomes que confundiriam visitantes.
 */
export const RESERVED_SLUGS = new Set([
  "admin",
  "preview",
  "s",
  "convite",
  "convites",
  "entrar",
  "sair",
  "conta",
  "configuracoes",
  "termos",
  "privacidade",
  "ajuda",
  "contato",
  "planos",
  "precos",
  "sobre",
  "robots",
  "sitemap",
  "manifest",
  "favicon",
  "www",
  "api",
  "app",
  "painel",
  "login",
  "mail",
  "email",
  "smtp",
  "ftp",
  "static",
  "assets",
  "media",
  "cdn",
  "img",
  "files",
  "status",
  "blog",
  "docs",
  "help",
  "suporte",
  "support",
  "dev",
  "staging",
  "test",
  "teste",
  "demo-admin",
]);

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(SLUG_PATTERN, "use 3 a 40 letras minúsculas, números ou hífen (sem hífen nas pontas)")
  .refine((s) => !s.includes("--"), "não use hífens seguidos")
  .refine((s) => !RESERVED_SLUGS.has(s), "este endereço é reservado");

/** Sugere um slug a partir do nome: "Studio Bella Ávila" → "studio-bella-avila". */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
