/**
 * Envia as variáveis de produção do `.env.neon` para o projeto da Netlify (D42) e confere o
 * tamanho de cada valor gravado. Lê o arquivo com `process.loadEnvFile` — nunca com `source` do
 * shell, que corta o link do Neon no `&` (aconteceu em 2026-10-21: DATABASE_URL ficou vazio).
 * Plano grátis: sem escopos nem "secret" (a API recusa); os valores só aparecem para a conta.
 * Uso: npx tsx scripts/netlify-env.ts [--deploy]
 */
const KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "PUBLIC_URL",
  "STORAGE_DRIVER",
] as const;

async function main() {
  process.loadEnvFile(".env.neon");
  const { NETLIFY_SITE_ID: site, NETLIFY_API_TOKEN: token } = process.env;
  if (!site || !token)
    throw new Error("Preencha NETLIFY_SITE_ID e NETLIFY_API_TOKEN no .env.neon.");
  const missing = KEYS.filter((k) => !process.env[k]);
  if (missing.length) throw new Error(`Vazio no .env.neon: ${missing.join(", ")}`);

  const api = "https://api.netlify.com/api/v1";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const info = (await (await fetch(`${api}/sites/${site}`, { headers })).json()) as {
    account_slug: string;
    ssl_url: string;
  };
  const base = `${api}/accounts/${info.account_slug}/env`;
  const current = (await (await fetch(`${base}?site_id=${site}`, { headers })).json()) as {
    key: string;
  }[];
  const existing = new Set(current.map((v) => v.key));

  for (const key of KEYS) {
    const value = process.env[key]!;
    const body = JSON.stringify({ key, values: [{ value, context: "all" }] });
    const res = existing.has(key)
      ? await fetch(`${base}/${key}?site_id=${site}`, { method: "PUT", headers, body })
      : await fetch(`${base}?site_id=${site}`, { method: "POST", headers, body: `[${body}]` });
    if (!res.ok) throw new Error(`${key}: ${res.status} ${await res.text()}`);
  }

  const saved = (await (await fetch(`${base}?site_id=${site}`, { headers })).json()) as {
    key: string;
    values: { context: string; value: string }[];
  }[];
  for (const key of KEYS) {
    const got = saved.find((v) => v.key === key)?.values.find((v) => v.context === "all")?.value;
    const ok = got?.length === process.env[key]!.length;
    console.log(`${ok ? "✔" : "✘"} ${key} (${got?.length ?? 0} caracteres)`);
    if (!ok) process.exitCode = 1;
  }
  if (process.env.BETTER_AUTH_URL !== info.ssl_url)
    console.log(`Atenção: BETTER_AUTH_URL difere do endereço do projeto (${info.ssl_url}).`);

  if (process.argv.includes("--deploy") && !process.exitCode) {
    const res = await fetch(`${api}/sites/${site}/builds`, { method: "POST", headers });
    console.log(res.ok ? "Deploy disparado." : `Deploy falhou: ${res.status}`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
