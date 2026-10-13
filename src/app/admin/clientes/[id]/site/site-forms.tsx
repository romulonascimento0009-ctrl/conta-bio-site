"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, valueOf, type FormState } from "@/app/admin/_components/form";
import { createSiteAction, publishAction, saveDraftAction } from "../../actions";

type ThemeOption = { id: string; label: string; colors: string[] };

export function CreateSiteForm({
  clientId,
  themes,
  defaultTheme,
}: {
  clientId: string;
  themes: ThemeOption[];
  defaultTheme: string;
}) {
  const [state, action] = useActionState(createSiteAction.bind(null, clientId), {} as FormState);
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <fieldset>
        <legend className="text-sm font-medium">Cores</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {themes.map((t) => (
            <label
              key={t.id}
              className="flex cursor-pointer flex-col gap-2 rounded-md border border-border p-3 has-checked:border-accent has-checked:ring-2 has-checked:ring-accent"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="theme"
                  value={t.id}
                  defaultChecked={t.id === defaultTheme}
                />
                <span className="font-medium">{t.label}</span>
              </span>
              <span aria-hidden="true" className="flex h-6 overflow-hidden rounded">
                {t.colors.map((c, i) => (
                  <span key={`${c}-${i}`} className="flex-1" style={{ background: c }} />
                ))}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Criando…">Criar Bio Site</SubmitButton>
      </div>
    </form>
  );
}

/** Sempre visível (para a confirmação não sumir); desativado quando não há o que publicar. */
export function PublishForm({ clientId, pending }: { clientId: string; pending: boolean }) {
  const [state, action] = useActionState(publishAction.bind(null, clientId), {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-1">
      {pending ? (
        <SubmitButton pendingText="Publicando…">Publicar rascunho</SubmitButton>
      ) : (
        <button
          type="button"
          disabled
          className="rounded-md bg-accent px-4 py-2 font-medium text-white opacity-60"
        >
          Publicar rascunho
        </button>
      )}
      <FormMessage state={state} />
    </form>
  );
}

export function DraftEditor({ clientId, initial }: { clientId: string; initial: string }) {
  const [state, action] = useActionState(saveDraftAction.bind(null, clientId), {} as FormState);
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <label htmlFor="document" className="text-sm font-medium">
        Documento do Bio Site (JSON)
      </label>
      <textarea
        id="document"
        name="document"
        defaultValue={valueOf(state, "document", initial)}
        rows={24}
        spellCheck={false}
        className="w-full rounded-md border border-border bg-white p-3 font-mono text-xs leading-relaxed"
      />
      <p
        role="status"
        className={`text-sm whitespace-pre-line ${state.ok ? "text-green-800" : "text-danger"}`}
      >
        {state.message}
      </p>
      <div>
        <SubmitButton>Validar e salvar</SubmitButton>
      </div>
    </form>
  );
}
