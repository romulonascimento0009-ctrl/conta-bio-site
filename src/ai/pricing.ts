/**
 * Preços da API da Claude (US$ por milhão de tokens, tabela de 2026-10). Usados para registrar o
 * custo de cada chamada e conferir o teto mensal. Modelo desconhecido (ex.: fallback novo) é
 * cobrado pelo preço do mais caro conhecido, para o teto nunca ficar por baixo.
 */
const PRICES: Record<
  string,
  { input: number; output: number; cacheWrite: number; cacheRead: number }
> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheWrite: 5, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-fable-5-1": { input: 10, output: 50, cacheWrite: 12.5, cacheRead: 0.25 },
};
const FALLBACK_PRICE = PRICES["claude-fable-5-1"];

/** Modelo usado nas chamadas da plataforma. */
export const AI_MODEL = "claude-opus-5-5";
/** Limite de saída por chamada; também define o pior custo possível de uma chamada. */
export const AI_MAX_TOKENS = 16000;

export type AiTokens = {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
};

/** Custo em milionésimos de dólar (US$ 1 = 1.000.000). */
export function costMicros(model: string, t: AiTokens): number {
  const p = PRICES[model] ?? FALLBACK_PRICE;
  return Math.ceil(
    t.input * p.input +
      t.output * p.output +
      t.cacheRead * p.cacheRead +
      t.cacheWrite * p.cacheWrite,
  );
}

/** Pior custo de uma chamada com `inputTokens` de entrada (saída no limite). */
export function worstCaseMicros(inputTokens: number): number {
  return costMicros(AI_MODEL, {
    input: inputTokens,
    output: AI_MAX_TOKENS,
    cacheRead: 0,
    cacheWrite: 0,
  });
}

/** Pode chamar a IA sem passar do teto, mesmo no pior caso? */
export function withinBudget(spentMicros: number, budgetUsd: number, nextWorstMicros: number) {
  return spentMicros + nextWorstMicros <= Math.round(budgetUsd * 1_000_000);
}

export const formatUsd = (micros: number) =>
  (micros / 1_000_000).toLocaleString("pt-BR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: micros > 0 && micros < 10_000 ? 4 : 2,
  });
