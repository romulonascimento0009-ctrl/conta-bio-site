/**
 * Aplica o visual padrão (D41: vidro neon, cartões iguais e sem destaque, `applyStandardLook`) no rascunho
 * de todos os Bio Sites. Não publica: o publicado só muda quando alguém publicar.
 * Uso: npx tsx --env-file-if-exists=.env.local scripts/apply-standard-look.ts
 */
import { eq } from "drizzle-orm";
import { recordAudit } from "@/data/audit";
import { closeDb, db } from "@/db";
import { clients, memberships, sites, user } from "@/db/schema";
import { validateBio } from "@/sites/bio";
import { changedParts } from "@/sites/changes";
import { applyStandardLook } from "@/sites/templates";

async function main() {
  const [op] = await db
    .select({ userId: user.id, email: user.email })
    .from(user)
    .innerJoin(memberships, eq(memberships.userId, user.id))
    .where(eq(memberships.role, "operator"));
  if (!op) throw new Error("Operador não encontrado (rode npm run admin:create).");

  const rows = await db
    .select({ clientId: sites.clientId, draft: sites.draft, slug: clients.slug })
    .from(sites)
    .innerJoin(clients, eq(clients.id, sites.clientId));

  for (const row of rows) {
    const parsed = validateBio(row.draft);
    if (!parsed.ok) {
      console.log(`/${row.slug}: rascunho inválido, não alterado (${parsed.issues[0].message})`);
      continue;
    }
    const next = validateBio(applyStandardLook(parsed.document));
    if (!next.ok) {
      console.log(`/${row.slug}: não alterado (${next.issues[0].path}: ${next.issues[0].message})`);
      continue;
    }
    const parts = changedParts(parsed.document, next.document);
    if (parts.length === 0) {
      console.log(`/${row.slug}: já estava no padrão`);
      continue;
    }
    await db.update(sites).set({ draft: next.document }).where(eq(sites.clientId, row.clientId));
    await recordAudit(
      row.clientId,
      "draft.save",
      { source: "Visual padrão (vidro neon)", parts },
      { ...op, role: "operator" },
    );
    console.log(`/${row.slug}: rascunho no padrão`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
