"use client";

import { useActionState } from "react";
import { publishAction } from "@/app/admin/clientes/actions";
import { FormMessage, inputClass, SubmitButton, type FormState } from "./form";

/**
 * Publicação com aprovação explícita. Sempre visível (para a confirmação não sumir após publicar);
 * desativado quando não há alterações ou quando o rascunho tem alterações ainda não salvas.
 */
export function PublishForm({
  clientId,
  pending,
  blockedReason,
}: {
  clientId: string;
  pending: boolean;
  blockedReason?: string;
}) {
  const [state, action] = useActionState(publishAction.bind(null, clientId), {} as FormState);
  const enabled = pending && !blockedReason;
  return (
    <form
      action={action}
      className="flex flex-col gap-2 rounded-md border border-border bg-white p-3"
    >
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="approve" disabled={!enabled} className="mt-0.5 size-4" />
        <span>Revisei a prévia e aprovo a publicação</span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span>Nota da versão (opcional)</span>
        <input
          name="note"
          maxLength={200}
          disabled={!enabled}
          placeholder="Ex.: novos horários"
          className={inputClass}
        />
      </label>
      {enabled ? (
        <SubmitButton pendingText="Publicando…">Publicar</SubmitButton>
      ) : (
        <button
          type="button"
          disabled
          className="rounded-md bg-accent px-4 py-2 font-medium text-white opacity-60"
        >
          Publicar
        </button>
      )}
      {!enabled && (
        <p className="text-sm text-muted">{blockedReason ?? "Nada novo para publicar."}</p>
      )}
      <FormMessage state={state} />
    </form>
  );
}
