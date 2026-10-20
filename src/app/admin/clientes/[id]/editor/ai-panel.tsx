"use client";

import { useId, useState, useTransition } from "react";
import { inputClass } from "@/app/admin/_components/form";
import type { AiEditResult } from "@/data/ai";
import { formatUsd } from "@/ai/pricing";
import type { BioDocument } from "@/sites/bio";
import { aiEditAction } from "../../actions";

export type AiInfo = { configured: boolean; spentMicros: number; budgetUsd: number };
export type AiProposal = Extract<AiEditResult, { ok: true }>;

/**
 * Aba IA do editor (só operador): montar a partir do cadastro ou pedir uma mudança. A proposta
 * aparece na prévia; aplicar só muda o rascunho do editor (e entra no desfazer).
 */
export function AiPanel({
  clientId,
  doc,
  info,
  proposal,
  onProposal,
  onApply,
}: {
  clientId: string;
  doc: BioDocument;
  info: AiInfo;
  proposal: AiProposal | null;
  onProposal: (p: AiProposal | null) => void;
  onApply: () => void;
}) {
  const id = useId();
  const [request, setRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [spent, setSpent] = useState(info.spentMicros);
  const [working, startWorking] = useTransition();

  function ask(mode: "generate" | "request") {
    setError(null);
    onProposal(null);
    startWorking(async () => {
      const r = await aiEditAction(clientId, mode, doc, request);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setSpent((s) => s + r.costMicros);
      onProposal(r);
    });
  }

  if (!info.configured)
    return (
      <div className="grid gap-2 rounded-md border border-border p-4 text-sm">
        <p className="font-semibold">IA desligada</p>
        <p className="text-muted">
          Coloque a chave da API da Claude no arquivo <code>.env.local</code> como{" "}
          <code>ANTHROPIC_API_KEY=…</code> e reinicie o servidor.
        </p>
      </div>
    );

  const budget = Math.round(info.budgetUsd * 1_000_000);
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted">
        Gasto com IA neste mês: <strong>{formatUsd(spent)}</strong> de {formatUsd(budget)}. A IA não
        mexe nos contatos e não inventa links; nada é salvo até você aplicar e salvar o rascunho.
      </p>

      {proposal ? (
        <section
          aria-labelledby={`${id}-prop`}
          className="grid gap-3 rounded-md border border-accent/50 bg-blue-50 p-4"
        >
          <h3 id={`${id}-prop`} className="font-semibold">
            Proposta da IA (veja na prévia)
          </h3>
          {proposal.summary && <p className="text-sm">{proposal.summary}</p>}
          {proposal.applied.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">Alterado:</p>
              <ul className="ml-5 list-disc">
                {proposal.applied.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {proposal.skipped.length > 0 && (
            <div className="text-sm">
              <p className="font-medium">Deixado de fora:</p>
              <ul className="ml-5 list-disc">
                {proposal.skipped.map((s, i) => (
                  <li key={i}>
                    {s.what}: {s.why}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-muted">
            Custo deste pedido: {formatUsd(proposal.costMicros)}. Aplicar substitui o rascunho do
            editor pela proposta (dá para desfazer).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onApply}
              className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              Aplicar no rascunho
            </button>
            <button
              type="button"
              onClick={() => onProposal(null)}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm"
            >
              Descartar
            </button>
          </div>
        </section>
      ) : (
        <>
          <fieldset className="grid gap-2 rounded-md border border-border p-4">
            <legend className="px-1 font-semibold">Montar a partir do cadastro</legend>
            <p className="text-sm text-muted">
              Slogan, categorias, textos dos cartões, destaque, faixa e um texto sobre a empresa,
              com base no Cadastro do cliente. Com logo, ajusta as cores do topo ao logo.
            </p>
            <button
              type="button"
              disabled={working}
              onClick={() => ask("generate")}
              className="justify-self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Montar com IA
            </button>
          </fieldset>
          <fieldset className="grid gap-2 rounded-md border border-border p-4">
            <legend className="px-1 font-semibold">Pedir uma mudança</legend>
            <label htmlFor={`${id}-req`} className="text-sm font-medium">
              O que você quer mudar?
            </label>
            <textarea
              id={`${id}-req`}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={3}
              maxLength={1000}
              placeholder="Ex.: deixe os textos mais alegres; coloque o catálogo logo depois do WhatsApp"
              className={inputClass}
            />
            <button
              type="button"
              disabled={working || !request.trim()}
              onClick={() => ask("request")}
              className="justify-self-start rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Pedir à IA
            </button>
          </fieldset>
        </>
      )}

      <p role="status" className="text-sm">
        {working ? "A IA está trabalhando… pode levar até um minuto." : ""}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
