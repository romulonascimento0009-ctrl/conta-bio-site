import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/** Validades oferecidas ao criar um convite, em dias. */
export const INVITE_TTL_DAYS = [1, 3, 7] as const;
export const DEFAULT_INVITE_TTL_DAYS = 7;

export const MIN_CLIENT_PASSWORD_LENGTH = 12;

/** Token do link: 32 bytes aleatórios (base64url). Só o hash vai para o banco. */
export function newInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type InviteStatus = "pending" | "used" | "expired" | "revoked";

export const INVITE_STATUS_LABEL: Record<InviteStatus, string> = {
  pending: "Aguardando",
  used: "Usado",
  expired: "Expirado",
  revoked: "Cancelado",
};

export function inviteStatus(
  invite: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now = new Date(),
): InviteStatus {
  if (invite.usedAt) return "used";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("e-mail inválido"));

export const inviteInputSchema = z.object({
  email: emailSchema,
  days: z.coerce
    .number()
    .refine((d) => (INVITE_TTL_DAYS as readonly number[]).includes(d), "validade inválida")
    .default(DEFAULT_INVITE_TTL_DAYS),
});

export const acceptInviteSchema = z
  .object({
    name: z.string().trim().min(1, "informe seu nome").max(80),
    password: z
      .string()
      .min(MIN_CLIENT_PASSWORD_LENGTH, `use pelo menos ${MIN_CLIENT_PASSWORD_LENGTH} caracteres`)
      .max(128),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "as senhas não conferem",
  });
