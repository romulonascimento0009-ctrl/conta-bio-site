import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { env } from "@/lib/env";
import { aiEditSchema, type AiEdit } from "./edits";
import { AI_MAX_TOKENS, AI_MODEL, type AiTokens } from "./pricing";
import { SYSTEM_PROMPT } from "./prompt";

export type AiCall = { edit: AiEdit; model: string; tokens: AiTokens };

export class AiUnavailable extends Error {}

let client: Anthropic | undefined;

/** IA ligada? (chave configurada ou modo simulado de teste) */
export function aiConfigured(): boolean {
  const e = env();
  return !!e.ANTHROPIC_API_KEY || e.AI_FAKE === "1";
}

/**
 * Pede as alterações à Claude. Resposta estruturada validada pelo `aiEditSchema`; se o modelo
 * recusar, a API tenta o modelo reserva definido por ela (`fallbacks: "default"`).
 */
export async function callClaude(
  userText: string,
  logo?: { data: string; mediaType: "image/webp" },
): Promise<AiCall> {
  const e = env();
  if (e.AI_FAKE === "1") {
    if (process.env.NODE_ENV === "production") throw new AiUnavailable("AI_FAKE em produção.");
    return fakeCall(userText);
  }
  if (!e.ANTHROPIC_API_KEY) throw new AiUnavailable("IA não configurada (ANTHROPIC_API_KEY).");
  client ??= new Anthropic({ apiKey: e.ANTHROPIC_API_KEY });

  let response;
  try {
    response = await client.beta.messages.parse({
      model: AI_MODEL,
      max_tokens: AI_MAX_TOKENS,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(aiEditSchema) },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: [
            ...(logo
              ? [
                  {
                    type: "image" as const,
                    source: {
                      type: "base64" as const,
                      media_type: logo.mediaType,
                      data: logo.data,
                    },
                  },
                ]
              : []),
            { type: "text" as const, text: userText },
          ],
        },
      ],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError)
      throw new AiUnavailable("Chave da API inválida. Confira ANTHROPIC_API_KEY no .env.local.");
    if (err instanceof Anthropic.RateLimitError)
      throw new AiUnavailable("Limite de uso da API atingido. Tente de novo em alguns minutos.");
    if (err instanceof Anthropic.APIConnectionError)
      throw new AiUnavailable("Sem conexão com a API da Claude. Confira a internet.");
    if (err instanceof Anthropic.APIError)
      throw new AiUnavailable(`A API da Claude respondeu com erro (${err.status}).`);
    throw err;
  }

  const u = response.usage;
  const tokens: AiTokens = {
    input: u.input_tokens,
    output: u.output_tokens,
    cacheRead: u.cache_read_input_tokens ?? 0,
    cacheWrite: u.cache_creation_input_tokens ?? 0,
  };
  if (response.stop_reason === "refusal")
    throw Object.assign(new AiUnavailable("A IA recusou este pedido. Reformule e tente de novo."), {
      tokens,
      model: response.model,
    });
  if (response.stop_reason === "max_tokens" || !response.parsed_output)
    throw Object.assign(new AiUnavailable("A IA não terminou a resposta. Tente um pedido menor."), {
      tokens,
      model: response.model,
    });
  return { edit: response.parsed_output, model: response.model, tokens };
}

/** Resposta simulada e determinística (testes E2E): troca o slogan e liga a faixa. */
function fakeCall(userText: string): AiCall {
  const generate = userText.includes("Monte o Bio Site completo");
  return {
    model: "fake",
    tokens: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    edit: {
      summary: generate
        ? "Slogan e faixa montados a partir do cadastro (simulado)."
        : "Pedido atendido (simulado).",
      edits: [
        {
          type: "set_profile",
          tagline: generate ? "Slogan criado pela IA" : "Slogan ajustado pela IA",
        },
        { type: "set_ticker", enabled: true, items: ["Aviso criado pela IA"] },
        {
          type: "add_card",
          after_id: null,
          action: "url",
          title: "Link inventado",
          url: "https://x.y",
        },
      ],
    },
  };
}
