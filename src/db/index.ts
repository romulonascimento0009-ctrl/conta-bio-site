import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Connection = { db: Db; close: () => Promise<void> };

function connect(): Connection {
  const { DATABASE_URL, PGLITE_DIR } = env();
  if (DATABASE_URL) {
    const client = postgres(DATABASE_URL, { max: 5 });
    return { db: drizzlePostgres(client, { schema }), close: () => client.end() };
  }
  // PGlite: Postgres embutido para desenvolvimento e testes. Um processo por diretório.
  mkdirSync(PGLITE_DIR, { recursive: true });
  const client = new PGlite(PGLITE_DIR);
  return { db: drizzlePglite(client, { schema }), close: () => client.close() };
}

// Reaproveita a conexão entre recarregamentos do servidor de desenvolvimento.
const globalForDb = globalThis as unknown as { __dbConnection?: Connection };

function connection(): Connection {
  globalForDb.__dbConnection ??= connect();
  return globalForDb.__dbConnection;
}

// Conexão preguiçosa: importar este módulo (ex.: durante o build) não abre o banco nem lê o ambiente.
export const db: Db = new Proxy({} as Db, {
  get: (_, prop) => {
    const real = connection().db;
    const value: unknown = Reflect.get(real, prop);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export async function closeDb(): Promise<void> {
  const conn = globalForDb.__dbConnection;
  globalForDb.__dbConnection = undefined;
  await conn?.close();
}
