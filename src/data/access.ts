import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import {
  acceptInviteSchema,
  hashInviteToken,
  inviteInputSchema,
  inviteStatus,
  newInviteToken,
  type InviteStatus,
} from "@/clients/invites";
import { db } from "@/db";
import { clients, invites, memberships, user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { publicUrl } from "@/lib/public-url";
import { requireOperator } from "@/lib/session";
import { recordAudit } from "./audit";
import { getClient } from "./clients";

const isUuid = (id: string) => z.uuid().safeParse(id).success;
const DAY_MS = 24 * 60 * 60 * 1000;

export class EmailTaken extends Error {
  constructor() {
    super("Já existe uma conta com este e-mail.");
  }
}

async function emailInUse(email: string): Promise<boolean> {
  const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  return !!row;
}

// ── Operador ────────────────────────────────────────────────────────────────

export type InviteSummary = {
  id: string;
  email: string;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
};

export type MemberSummary = { userId: string; name: string; email: string; since: Date };

/**
 * Cria um convite de uso único. Devolve o link com o token — ele só existe neste momento
 * (o banco guarda apenas o hash).
 */
export async function createInvite(
  clientId: string,
  input: unknown,
): Promise<{ link: string; expiresAt: Date }> {
  const operator = await requireOperator();
  const client = await getClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  const { email, days } = inviteInputSchema.parse(input);
  if (await emailInUse(email)) throw new EmailTaken();

  const token = newInviteToken();
  const expiresAt = new Date(Date.now() + days * DAY_MS);
  await db.insert(invites).values({
    clientId: client.id,
    email,
    tokenHash: hashInviteToken(token),
    expiresAt,
    createdBy: operator.userId,
  });
  await recordAudit(client.id, "invite.create", { email, days });
  return { link: publicUrl(`convite/${token}`), expiresAt };
}

export async function listInvites(clientId: string): Promise<InviteSummary[]> {
  await requireOperator();
  const client = await getClient(clientId);
  if (!client) return [];
  const rows = await db
    .select()
    .from(invites)
    .where(eq(invites.clientId, client.id))
    .orderBy(desc(invites.createdAt));
  const now = new Date();
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    status: inviteStatus(r, now),
    expiresAt: r.expiresAt,
    createdAt: r.createdAt,
  }));
}

export async function revokeInvite(clientId: string, inviteId: string): Promise<boolean> {
  await requireOperator();
  const client = await getClient(clientId);
  if (!client || !isUuid(inviteId)) return false;
  const [row] = await db
    .update(invites)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(invites.id, inviteId),
        eq(invites.clientId, client.id),
        isNull(invites.usedAt),
        isNull(invites.revokedAt),
      ),
    )
    .returning({ email: invites.email });
  if (!row) return false;
  await recordAudit(client.id, "invite.revoke", { email: row.email });
  return true;
}

export async function listMembers(clientId: string): Promise<MemberSummary[]> {
  await requireOperator();
  const client = await getClient(clientId);
  if (!client) return [];
  return db
    .select({ userId: user.id, name: user.name, email: user.email, since: memberships.createdAt })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(and(eq(memberships.clientId, client.id), eq(memberships.role, "client")))
    .orderBy(user.email);
}

/** Remove a conta do cliente (sessões e senha caem junto, em cascata). */
export async function removeMember(clientId: string, userId: string): Promise<boolean> {
  await requireOperator();
  const client = await getClient(clientId);
  if (!client) return false;
  const [m] = await db
    .select({ email: user.email })
    .from(memberships)
    .innerJoin(user, eq(user.id, memberships.userId))
    .where(
      and(
        eq(memberships.userId, userId),
        eq(memberships.clientId, client.id),
        eq(memberships.role, "client"),
      ),
    );
  if (!m) return false;
  await db.delete(user).where(eq(user.id, userId));
  await recordAudit(client.id, "member.remove", { email: m.email });
  return true;
}

// ── Público (página do convite) ────────────────────────────────────────────

export type InviteLookup =
  | { status: "pending"; email: string; clientName: string }
  | { status: Exclude<InviteStatus, "pending"> | "not_found" };

/** Situação do convite pelo token do link (sem sessão). */
export async function lookupInvite(token: string): Promise<InviteLookup> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { status: "not_found" };
  const [row] = await db
    .select({ invite: invites, clientName: clients.name })
    .from(invites)
    .innerJoin(clients, eq(clients.id, invites.clientId))
    .where(eq(invites.tokenHash, hashInviteToken(token)));
  if (!row) return { status: "not_found" };
  const status = inviteStatus(row.invite);
  return status === "pending"
    ? { status, email: row.invite.email, clientName: row.clientName }
    : { status };
}

export class InviteUnavailable extends Error {
  constructor() {
    super("Este convite não é mais válido. Peça um novo link a quem te convidou.");
  }
}

/**
 * Aceita o convite: cria a conta do cliente, vincula à empresa e já entra (cookies de sessão).
 * Uso único garantido no banco: só um UPDATE consegue marcar `used_at` de um convite válido.
 */
export async function acceptInvite(token: string, input: unknown): Promise<void> {
  const data = acceptInviteSchema.parse(input);
  const tokenHash = hashInviteToken(token);
  const now = new Date();

  const [invite] = await db
    .update(invites)
    .set({ usedAt: now })
    .where(
      and(
        eq(invites.tokenHash, tokenHash),
        isNull(invites.usedAt),
        isNull(invites.revokedAt),
        gt(invites.expiresAt, now),
      ),
    )
    .returning();
  if (!invite) throw new InviteUnavailable();

  let userId: string | undefined;
  try {
    if (await emailInUse(invite.email)) throw new EmailTaken();
    const ctx = await auth.$context;
    const created = await ctx.internalAdapter.createUser(
      { name: data.name, email: invite.email, emailVerified: true },
      { method: "invite" },
    );
    userId = created.id;
    await ctx.internalAdapter.linkAccount({
      userId,
      providerId: "credential",
      accountId: userId,
      password: await ctx.password.hash(data.password),
    });
    await db.insert(memberships).values({ userId, role: "client", clientId: invite.clientId });
  } catch (err) {
    // Falhou no meio: desfaz a conta parcial e libera o convite para nova tentativa.
    if (userId) await db.delete(user).where(eq(user.id, userId));
    await db.update(invites).set({ usedAt: null }).where(eq(invites.id, invite.id));
    throw err;
  }

  await recordAudit(
    invite.clientId,
    "invite.accept",
    { email: invite.email },
    { userId, email: invite.email, role: "client" },
  );
  await auth.api.signInEmail({
    body: { email: invite.email, password: data.password },
    headers: await headers(),
  });
}
