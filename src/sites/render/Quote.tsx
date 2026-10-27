"use client";

import { useId, useState } from "react";
import type { BlockOf } from "@/sites/bio";
import { whatsappHref } from "@/sites/links";
import { missingAnswers, quoteMessage, type QuoteAnswers } from "@/sites/quote";
import { Icon } from "./Icon";

/**
 * "Pedir orçamento" (Casa Limpa; protótipo `prototipos/bio-site-casa-limpa.html`): perguntas de
 * tocar e de escrever dentro do painel do cartão. O botão só libera com as obrigatórias
 * respondidas e abre o WhatsApp com a mensagem pronta (nada é enviado pelo site).
 */
export function QuoteForm({ block, whatsapp }: { block: BlockOf<"quote">; whatsapp: string }) {
  const [answers, setAnswers] = useState<QuoteAnswers>({});
  const uid = useId();
  const missing = missingAnswers(block, answers);
  const ready = missing.length === 0;

  function toggle(id: string, option: string, multi: boolean) {
    setAnswers((prev) => {
      const cur = prev[id];
      if (multi) {
        const list = Array.isArray(cur) ? cur : [];
        return {
          ...prev,
          [id]: list.includes(option) ? list.filter((o) => o !== option) : [...list, option],
        };
      }
      return { ...prev, [id]: Array.isArray(cur) && cur[0] === option ? [] : [option] };
    });
  }

  return (
    <div className="bio-quote">
      {block.intro && <p className="bio-quote-intro">{block.intro}</p>}
      {block.questions.map((q) =>
        q.kind === "text" ? (
          <div key={q.id} className="bio-quote-q">
            <label htmlFor={`${uid}-${q.id}`}>{q.label}</label>
            <input
              id={`${uid}-${q.id}`}
              type="text"
              maxLength={80}
              placeholder={q.placeholder}
              value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
            />
          </div>
        ) : (
          <fieldset key={q.id} className="bio-quote-q">
            <legend>{q.label}</legend>
            <div className="bio-quote-opts">
              {q.options.map((o) => {
                const a = answers[q.id];
                const on = Array.isArray(a) && a.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(q.id, o, q.kind === "multi")}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ),
      )}
      {block.note && <p className="bio-quote-note">{block.note}</p>}
      <button
        type="button"
        className="bio-quote-send"
        aria-disabled={!ready}
        // Só conta nas métricas o envio de verdade (com tudo respondido).
        data-track={ready ? `q:${block.id}` : undefined}
        onClick={() => {
          if (!ready) return;
          window.open(
            whatsappHref(whatsapp, quoteMessage(block, answers)),
            "_blank",
            "noopener,noreferrer",
          );
        }}
      >
        <Icon name="whatsapp" />
        Enviar pelo WhatsApp
      </button>
      <p className="bio-quote-missing" aria-live="polite">
        {ready
          ? ""
          : `Falta responder: ${missing.map((q) => q.label.replace(/\?$/, "").toLowerCase()).join(", ")}.`}
      </p>
    </div>
  );
}
