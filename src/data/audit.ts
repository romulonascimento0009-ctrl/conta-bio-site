import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { getAccess, requireOperator } from "@/lib/session";
import { getClient } from "./clients";

export const AUDIT_ACTIONS = {
  "client.update": "Dados do cliente alterados",
  "briefing.save": "Cadastro do cliente salvo",
  "site.create": "Bio Site criado",
  "draft.save": "Rascunho salvo",
  "site.publish": "Publicado",
  "version.restore": "Versão restaurada no rascunho",
  "version.publish": "Versão republicada",
  "asset.upload": "Imagem enviada",
  "asset.alt": "Descrição de imagem alterada",
  "asset.delete": "Imagem excluída",
  "invite.create": "Convite criado",
  "invite.revoke": "Convite cancelado",
  "invite.accept": "Convite aceito",
  "member.remove": "Acesso removido",
  "ai.request": "Pedido à IA (prévia)",
} as const;
export type AuditAction = keyof typeof AUDIT_ACTIONS;

export type AuditEntry = typeof auditLog.$inferSelect;

/**
 * Registra uma ação do usuário atual. Chamado pela camada de dados depois que a ação deu certo
 * (o acesso ao cliente já foi verificado por quem chama). `actor` só para quem ainda não tem
 * sessão (aceite de convite).
 */
export async function recordAudit(
  clientId: string,
  action: AuditAction,
  details: Record<string, unknown> = {},
  actor?: { userId: string; email: string; role: string },
): Promise<void> {
  const access = actor ?? (await getAccess());
  if (!access) return;
  await db.insert(auditLog).values({
    clientId,
    userId: access.userId,
    actorEmail: access.email,
    actorRole: access.role,
    action,
    details,
  });
}

/** Últimas ações registradas de um cliente (só operador). */
export async function listAudit(clientId: string, limit = 200): Promise<AuditEntry[]> {
  await requireOperator();
  const client = await getClient(clientId);
  if (!client) return [];
  return db
    .select()
    .from(auditLog)
    .where(eq(auditLog.clientId, client.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);
}
