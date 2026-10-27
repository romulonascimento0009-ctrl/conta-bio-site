import type { BlockOf, QuoteQuestion } from "./bio";

/** Respostas do "Pedir orçamento": opções marcadas (escolha) ou o texto digitado. */
export type QuoteAnswers = Record<string, string[] | string>;

function answerText(q: QuoteQuestion, a: string[] | string | undefined): string {
  if (Array.isArray(a)) return q.options.filter((o) => a.includes(o)).join(", ");
  return (a ?? "").trim();
}

/** Perguntas obrigatórias ainda sem resposta (na ordem do painel). */
export function missingAnswers(block: BlockOf<"quote">, answers: QuoteAnswers): QuoteQuestion[] {
  return block.questions.filter((q) => q.required && !answerText(q, answers[q.id]));
}

/**
 * Mensagem pronta do WhatsApp: a saudação e uma linha por pergunta respondida
 * ("• Quartos: 2"); as não respondidas ficam de fora.
 */
export function quoteMessage(block: BlockOf<"quote">, answers: QuoteAnswers): string {
  const lines = [block.greeting];
  for (const q of block.questions) {
    const a = answerText(q, answers[q.id]);
    if (a) lines.push(`• ${q.label.replace(/\?$/, "")}: ${a}`);
  }
  return lines.join("\n");
}
