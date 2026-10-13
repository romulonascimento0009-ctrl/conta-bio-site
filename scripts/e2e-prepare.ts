/** Recria o banco de teste do zero, aplica migrações e cria o operador de teste. */
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

const dir = process.env.PGLITE_DIR ?? "";
if (!dir.startsWith(".data/e2e/")) {
  throw new Error(`Recusando apagar PGLITE_DIR fora de .data/e2e/: ${JSON.stringify(dir)}`);
}
rmSync(".data/e2e", { recursive: true, force: true });

const run = (script: string) =>
  execFileSync(process.execPath, ["--import", "tsx", script], { stdio: "inherit" });

run("scripts/migrate.ts");
run("scripts/create-admin.ts");
run("scripts/seed-demo.ts");
