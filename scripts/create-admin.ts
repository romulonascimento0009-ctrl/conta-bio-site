/**
 * Cria o operador (único usuário) ou redefine a senha dele.
 * Uso: npm run admin:create
 * Lê ADMIN_EMAIL / ADMIN_PASSWORD do ambiente; se ausentes, pergunta no terminal.
 */
import { createInterface } from "node:readline/promises";
import { count } from "drizzle-orm";
import { closeDb, db } from "@/db";
import { user } from "@/db/schema";
import { auth, MIN_PASSWORD_LENGTH } from "@/lib/auth";

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function main() {
  const email = (process.env.ADMIN_EMAIL || (await ask("E-mail do operador: "))).toLowerCase();
  const password =
    process.env.ADMIN_PASSWORD || (await ask("Senha (visível no terminal; limpe depois): "));

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }

  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const existing = await ctx.internalAdapter.findUserByEmail(email, { includeAccounts: true });

  if (existing) {
    const hasCredential = existing.accounts.some((a) => a.providerId === "credential");
    if (hasCredential) {
      await ctx.internalAdapter.updatePassword(existing.user.id, hash);
    } else {
      await ctx.internalAdapter.linkAccount({
        userId: existing.user.id,
        providerId: "credential",
        accountId: existing.user.id,
        password: hash,
      });
    }
    console.log(`Senha redefinida para ${email}.`);
    return;
  }

  const [{ total }] = await db.select({ total: count() }).from(user);
  if (total > 0) {
    throw new Error(
      "Já existe um operador com outro e-mail. A plataforma admite um único operador.",
    );
  }

  const created = await ctx.internalAdapter.createUser(
    { name: "Operador", email, emailVerified: true },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });
  console.log(`Operador criado: ${email}.`);
}

main()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
