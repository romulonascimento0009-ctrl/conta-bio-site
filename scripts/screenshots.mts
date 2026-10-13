/**
 * Capturas para revisÃ£o visual em celular, tablet e desktop.
 * Uso: npx tsx scripts/screenshots.mts <url> <pasta-de-saÃ­da>
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) {
  console.error("Uso: npx tsx scripts/screenshots.mts <url> <pasta-de-saÃ­da>");
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

const VIEWPORTS = [
  ["mobile", 390, 844],
  ["tablet", 768, 1024],
  ["desktop", 1280, 800],
] as const;

const browser = await chromium.launch();
try {
  for (const [name, width, height] of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width, height } });
    const res = await page.goto(url, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    console.log(
      `${name}: HTTP ${res?.status()} Â· rolagem horizontal ${overflow > 0 ? `${overflow}px (!)` : "nenhuma"}`,
    );
    await page.screenshot({ path: path.join(outDir, `${name}-top.png`) });
    await page.screenshot({ path: path.join(outDir, `${name}-full.png`), fullPage: true });
    await page.close();
  }
} finally {
  await browser.close();
}
