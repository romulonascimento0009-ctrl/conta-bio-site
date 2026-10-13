import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { closeDb, db } from "@/db";
import { env } from "@/lib/env";

async function main() {
  const migrationsFolder = "./drizzle";
  if (env().DATABASE_URL) {
    await migratePostgres(db as unknown as PostgresJsDatabase, { migrationsFolder });
  } else {
    await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder });
  }
  console.log("Migrações aplicadas.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
