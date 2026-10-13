import { defineConfig } from "drizzle-kit";

// Usado apenas para gerar migrações (`npm run db:generate`), que não precisa de conexão.
// As migrações são aplicadas por `npm run db:migrate` (scripts/migrate.ts).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
});
