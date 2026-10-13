import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";

/** Sessão validada no servidor (uma consulta por requisição). */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/**
 * Exige operador autenticado. Chamar em toda página, layout, Route Handler e
 * Server Action administrativa — o proxy faz apenas um redirecionamento otimista.
 */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
