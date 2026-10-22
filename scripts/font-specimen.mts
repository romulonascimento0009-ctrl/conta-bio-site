/**
 * Amostra de todas as fontes carregadas numa página com texto acentuado em português.
 * Uso: npx tsx scripts/font-specimen.mts <url-de-um-site> <arquivo.png>
 */
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2 });
await p.goto(process.argv[2], { waitUntil: "networkidle" });
const families = await p.evaluate(async () => {
  // Nomes com espaço ou número ("Exo 2") precisam de aspas no CSS.
  const fams = [...new Set([...document.fonts].map((f) => f.family))]
    .filter((f) => !/Fallback/i.test(f))
    .map((f) => (/^["']/.test(f) ? f : `"${f}"`));
  const box = document.createElement("div");
  box.id = "specimen";
  box.style.cssText = "background:#fff;color:#111;padding:16px;position:relative;z-index:99";
  for (const fam of fams) {
    const line = document.createElement("div");
    line.style.cssText = `font-family:${fam};font-size:40px;line-height:1.3`;
    line.textContent = `você é ação pôr não Ângela à Ç õ — ${fam.replace(/['"]/g, "")}`;
    box.append(line);
  }
  document.body.prepend(box);
  await Promise.all(fams.map((f) => document.fonts.load(`40px ${f}`, "você é")));
  await document.fonts.ready;
  return fams;
});
console.log(families);
await p.waitForTimeout(500);
await p.locator("#specimen").screenshot({ path: process.argv[3] });
await b.close();
