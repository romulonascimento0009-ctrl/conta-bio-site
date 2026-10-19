/**
 * Captura a prévia do RASCUNHO de um cliente (celular), logado como operador — para conferir
 * alterações no modelo oficial (Park Vision) antes de publicar.
 * Uso: $env:OP_EMAIL=...; $env:OP_PASS=...; npx tsx scripts/preview-screenshot.mts <slug> <arquivo.png>
 * Requer o servidor rodando em http://localhost:3000.
 */
import { chromium, devices } from "@playwright/test";

const [slug, out] = process.argv.slice(2);
if (!slug || !out) throw new Error("Uso: preview-screenshot.mts <slug> <arquivo.png>");
const base = "http://localhost:3000";
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["Pixel 7"] });
const page = await ctx.newPage();
const login = await page.request.post(`${base}/api/auth/sign-in/email`, {
  headers: { origin: base },
  data: { email: process.env.OP_EMAIL, password: process.env.OP_PASS },
});
if (!login.ok()) throw new Error(`Login falhou (${login.status()}).`);
await page.goto(`${base}/admin`);
const href = await page
  .locator(`a[href*="/admin/clientes/"]`)
  .filter({ hasText: new RegExp(slug.replace(/-/g, ".?"), "i") })
  .first()
  .getAttribute("href");
const id = href?.split("/")[3];
if (!id) throw new Error(`Cliente "${slug}" não encontrado no painel.`);
await page.goto(`${base}/preview/${id}`);
await page.waitForTimeout(1500);
await page.screenshot({ path: out, fullPage: true });
console.log(`Prévia salva em ${out}`);
await browser.close();
