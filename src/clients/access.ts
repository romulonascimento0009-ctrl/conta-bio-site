/** Papéis. Operador: todos os clientes. Cliente: só o próprio Bio Site. */
export const ROLES = ["operator", "client"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = { operator: "Operador", client: "Cliente" };

export type Access =
  | { userId: string; email: string; name: string; role: "operator" }
  | { userId: string; email: string; name: string; role: "client"; clientId: string };

/** Regra única de isolamento: o operador vê todos; o cliente, só o próprio. */
export function canAccessClient(access: Access | null, clientId: string): boolean {
  if (!access) return false;
  return access.role === "operator" || access.clientId === clientId;
}

/** Página inicial de cada papel. */
export function homeFor(access: Access): string {
  return access.role === "operator" ? "/admin" : "/painel";
}
