/**
 * Copia um cliente do banco local (PGlite, só leitura) para a produção (Neon + Netlify Blobs, D42):
 * cadastro, Bio Site, versões, imagens, auditoria e métricas, mais as contas do operador e dos
 * usuários desse cliente (mesma senha). Para se o cliente já existir na produção.
 * Também remove as demos da produção com `--remove-demos`.
 * Uso: npx tsx --env-file=.env.neon scripts/copy-client-to-prod.ts <slug> [--remove-demos]
 * Requer o servidor local parado (PGlite: um processo por vez).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { closeDb, db } from "@/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { storage } from "@/lib/storage";

const {
  account,
  assets,
  auditLog,
  briefings,
  clients,
  memberships,
  sites,
  siteEvents,
  siteVersions,
  user,
} = schema;

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await listFiles(full)));
    else files.push(full);
  }
  return files;
}

async function main() {
  const [slug, ...flags] = process.argv.slice(2);
  if (!slug) throw new Error("Uso: copy-client-to-prod.ts <slug> [--remove-demos]");
  if (!env().DATABASE_URL) throw new Error("DATABASE_URL vazio: rode com --env-file=.env.neon.");
  if (env().STORAGE_DRIVER !== "netlify-blobs")
    throw new Error("STORAGE_DRIVER precisa ser netlify-blobs.");

  if (flags.includes("--remove-demos")) {
    const demos = await db
      .select({ id: clients.id, slug: clients.slug })
      .from(clients)
      .where(like(clients.slug, "demo-%"));
    for (const d of demos) {
      await storage().deletePrefix(`clients/${d.id}`);
      await db.delete(clients).where(eq(clients.id, d.id));
      console.log(`Removida da produção: /${d.slug}`);
    }
  }

  const local = new PGlite(".data/pglite");
  const src = drizzle(local, { schema });
  try {
    const [client] = await src.select().from(clients).where(eq(clients.slug, slug));
    if (!client) throw new Error(`/${slug} não existe no banco local.`);
    const [exists] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.slug, slug));
    if (exists) throw new Error(`/${slug} já existe na produção; nada foi alterado.`);

    // Contas: operador(es) + usuários deste cliente.
    const members = await src
      .select()
      .from(memberships)
      .where(or(eq(memberships.role, "operator"), eq(memberships.clientId, client.id)));
    const userIds = [...new Set(members.map((m) => m.userId))];
    const users = userIds.length
      ? await src.select().from(user).where(inArray(user.id, userIds))
      : [];
    const accounts = userIds.length
      ? await src.select().from(account).where(inArray(account.userId, userIds))
      : [];
    const known = new Set((await db.select({ id: user.id }).from(user)).map((u) => u.id));
    const newUsers = users.filter((u) => !known.has(u.id));
    if (newUsers.length) await db.insert(user).values(newUsers);
    const newAccounts = accounts.filter((a) => !known.has(a.userId));
    if (newAccounts.length) await db.insert(account).values(newAccounts);

    await db.insert(clients).values(client);
    const operators = members.filter((m) => m.role === "operator" && !known.has(m.userId));
    const own = members.filter((m) => m.clientId === client.id);
    if (operators.length || own.length) await db.insert(memberships).values([...operators, ...own]);

    const briefing = await src.select().from(briefings).where(eq(briefings.clientId, client.id));
    if (briefing.length) await db.insert(briefings).values(briefing);
    const [site] = await src.select().from(sites).where(eq(sites.clientId, client.id));
    const versions = site
      ? await src.select().from(siteVersions).where(eq(siteVersions.siteId, site.id))
      : [];
    if (site) {
      await db.insert(sites).values({ ...site, publishedVersionId: null });
      if (versions.length) await db.insert(siteVersions).values(versions);
      await db
        .update(sites)
        .set({ publishedVersionId: site.publishedVersionId })
        .where(eq(sites.id, site.id));
    }
    const imgs = await src.select().from(assets).where(eq(assets.clientId, client.id));
    if (imgs.length) await db.insert(assets).values(imgs);
    const audit = await src.select().from(auditLog).where(eq(auditLog.clientId, client.id));
    const prodUsers = new Set((await db.select({ id: user.id }).from(user)).map((u) => u.id));
    const auditRows = audit.map((a) =>
      a.userId && !prodUsers.has(a.userId) ? { ...a, userId: null } : a,
    );
    for (let i = 0; i < auditRows.length; i += 500)
      await db.insert(auditLog).values(auditRows.slice(i, i + 500));
    const events = await src.select().from(siteEvents).where(eq(siteEvents.clientId, client.id));
    for (let i = 0; i < events.length; i += 500)
      await db.insert(siteEvents).values(events.slice(i, i + 500));

    // Arquivos: tudo sob clients/<id> na pasta local vai para o Blobs com a mesma chave.
    const root = path.resolve(".data/storage");
    const files = await listFiles(path.join(root, "clients", client.id));
    for (const f of files) {
      const key = path.relative(root, f).split(path.sep).join("/");
      await storage().put(key, new Uint8Array(await readFile(f)));
    }

    console.log(
      `/${slug} copiado: ${versions.length} versões, ${imgs.length} imagens (${files.length} arquivos), ` +
        `${newUsers.length} conta(s) nova(s), ${auditRows.length} registros de auditoria, ${events.length} métricas.`,
    );
  } finally {
    await local.close();
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
