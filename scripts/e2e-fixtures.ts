/** Dados que a interface não consegue criar: um convite já expirado (para o demo-salao). */
import { eq } from "drizzle-orm";
import { hashInviteToken } from "@/clients/invites";
import { closeDb, db } from "@/db";
import { clients, invites } from "@/db/schema";
import { EXPIRED_INVITE_TOKEN } from "../e2e/fixtures";

async function main() {
  const [salao] = await db.select().from(clients).where(eq(clients.slug, "demo-salao"));
  if (!salao) throw new Error("demo-salao não encontrado: rode o seed antes.");
  await db.insert(invites).values({
    clientId: salao.id,
    email: "expirado@teste.local",
    tokenHash: hashInviteToken(EXPIRED_INVITE_TOKEN),
    expiresAt: new Date(Date.now() - 60_000),
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
