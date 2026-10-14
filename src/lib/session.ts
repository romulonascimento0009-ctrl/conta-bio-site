import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { canAccessClient, type Access } from "@/clients/access";
import { db } from "@/db";
import { memberships } from "@/db/schema";
import { auth } from "@/lib/auth";

/** Sessão validada no servidor (uma consulta por requisição). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Sessão + papel. `null` se não houver sessão ou se o usuário não tiver papel (padrão negar).
 */
export const getAccess = cache(async (): Promise<Access | null> => {
  const session = await getSession();
  if (!session) return null;
  const [m] = await db.select().from(memberships).where(eq(memberships.userId, session.user.id));
  if (!m) return null;
  const who = { userId: session.user.id, email: session.user.email, name: session.user.name };
  if (m.role === "operator") return { ...who, role: "operator" };
  return m.clientId ? { ...who, role: "client", clientId: m.clientId } : null;
});

/** Exige sessão (qualquer papel). Só para sair da conta. */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** Exige usuário com papel. Sem sessão ou sem papel → /login. */
export async function requireAccess(): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/login");
  return access;
}

/**
 * Exige o operador. Chamar em toda página, layout, Route Handler e Server Action exclusiva do
 * operador — o proxy faz apenas um redirecionamento otimista. Cliente → /painel.
 */
export async function requireOperator(): Promise<Extract<Access, { role: "operator" }>> {
  const access = await requireAccess();
  if (access.role !== "operator") redirect("/painel");
  return access;
}

/** Exige usuário cliente (área /painel). Operador → /admin. */
export async function requireClientUser(): Promise<Extract<Access, { role: "client" }>> {
  const access = await requireAccess();
  if (access.role !== "client") redirect("/admin");
  return access;
}

/**
 * Exige acesso a este cliente (operador: qualquer um; cliente: só o próprio).
 * Outro cliente → 404 (não revela se existe).
 */
export async function requireClientAccess(clientId: string): Promise<Access> {
  const access = await requireAccess();
  if (!canAccessClient(access, clientId)) notFound();
  return access;
}
