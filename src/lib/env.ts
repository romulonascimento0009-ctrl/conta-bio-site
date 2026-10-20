import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const envSchema = z.object({
  DATABASE_URL: z.preprocess(emptyToUndefined, z.url().optional()),
  PGLITE_DIR: z.preprocess(emptyToUndefined, z.string().default(".data/pglite")),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET precisa de pelo menos 32 caracteres"),
  BETTER_AUTH_URL: z.url(),
  STORAGE_DIR: z.preprocess(emptyToUndefined, z.string().default(".data/storage")),
  /** Endereço público da plataforma: Bio Sites em <PUBLIC_URL>/<slug>. */
  PUBLIC_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  /** Chave da API da Claude (Fase 5). Vazia = IA desligada no painel. */
  ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().startsWith("sk-ant-").optional()),
  /** Teto de gasto com IA por mês (US$), somando todos os clientes. */
  AI_MONTHLY_BUDGET_USD: z.preprocess(emptyToUndefined, z.coerce.number().positive().default(10)),
  /** "1" = respostas simuladas da IA, sem chamar a API (testes E2E). Proibido em produção. */
  AI_FAKE: z.preprocess(emptyToUndefined, z.enum(["1"]).optional()),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Lê e valida as variáveis de ambiente na primeira chamada. Falha cedo com mensagem clara. */
export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Variáveis de ambiente inválidas:\n${issues.join("\n")}`);
  }
  cached = parsed.data;
  return cached;
}
