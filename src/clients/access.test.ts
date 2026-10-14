import { describe, expect, it } from "vitest";
import { briefingSchema } from "./briefing";
import { canAccessClient, homeFor, type Access } from "./access";
import {
  acceptInviteSchema,
  hashInviteToken,
  inviteInputSchema,
  inviteStatus,
  newInviteToken,
} from "./invites";
import { changedParts } from "@/sites/changes";
import { applyOperation } from "@/sites/operations";
import { createBioDocument } from "@/sites/templates";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const operator: Access = { userId: "op", email: "op@x.com", name: "Op", role: "operator" };
const clientA: Access = { userId: "a", email: "a@x.com", name: "A", role: "client", clientId: A };

describe("canAccessClient", () => {
  it("operador acessa qualquer cliente", () => {
    expect(canAccessClient(operator, A)).toBe(true);
    expect(canAccessClient(operator, B)).toBe(true);
  });

  it("cliente acessa só o próprio", () => {
    expect(canAccessClient(clientA, A)).toBe(true);
    expect(canAccessClient(clientA, B)).toBe(false);
  });

  it("sem papel não acessa nada", () => {
    expect(canAccessClient(null, A)).toBe(false);
  });

  it("página inicial por papel", () => {
    expect(homeFor(operator)).toBe("/admin");
    expect(homeFor(clientA)).toBe("/painel");
  });
});

describe("convites", () => {
  it("token aleatório e hash estável", () => {
    const t = newInviteToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newInviteToken()).not.toBe(t);
    expect(hashInviteToken(t)).toBe(hashInviteToken(t));
    expect(hashInviteToken(t)).not.toContain(t);
  });

  it("situação: usado e cancelado têm precedência sobre a validade", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    const future = new Date("2026-10-14T12:00:00Z");
    const past = new Date("2026-10-12T12:00:00Z");
    const base = { usedAt: null, revokedAt: null };
    expect(inviteStatus({ ...base, expiresAt: future }, now)).toBe("pending");
    expect(inviteStatus({ ...base, expiresAt: past }, now)).toBe("expired");
    expect(inviteStatus({ ...base, expiresAt: now }, now)).toBe("expired");
    expect(inviteStatus({ ...base, usedAt: past, expiresAt: past }, now)).toBe("used");
    expect(inviteStatus({ ...base, revokedAt: past, expiresAt: future }, now)).toBe("revoked");
  });

  it("entrada do convite: e-mail normalizado e validade da lista", () => {
    expect(inviteInputSchema.parse({ email: " Ana@Loja.COM ", days: "3" })).toEqual({
      email: "ana@loja.com",
      days: 3,
    });
    expect(inviteInputSchema.safeParse({ email: "ana@loja.com", days: "30" }).success).toBe(false);
    expect(inviteInputSchema.safeParse({ email: "ana", days: "7" }).success).toBe(false);
  });

  it("aceite: senha longa e confirmação igual", () => {
    const ok = { name: "Ana", password: "senha-forte-123", confirm: "senha-forte-123" };
    expect(acceptInviteSchema.safeParse(ok).success).toBe(true);
    expect(
      acceptInviteSchema.safeParse({ ...ok, password: "curta", confirm: "curta" }).success,
    ).toBe(false);
    const mismatch = acceptInviteSchema.safeParse({ ...ok, confirm: "outra-senha-123" });
    expect(mismatch.success).toBe(false);
    expect(mismatch.error?.issues[0].path).toEqual(["confirm"]);
  });
});

describe("changedParts", () => {
  const doc = createBioDocument({
    segment: "food",
    briefing: briefingSchema.parse({ businessName: "Forno", instagram: "forno" }),
  });

  it("nada mudou", () => {
    expect(changedParts(structuredClone(doc), doc)).toEqual([]);
  });

  it("aponta as partes alteradas", () => {
    const next = applyOperation(doc, { type: "profile", patch: { name: "Outro" } });
    expect(changedParts(doc, next)).toEqual(["Topo"]);
  });

  it("documento anterior ausente: tudo mudou", () => {
    expect(changedParts(null, doc)).toContain("Blocos");
  });
});
