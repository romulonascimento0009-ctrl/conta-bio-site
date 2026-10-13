"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, valueOf, type FormState } from "@/app/admin/_components/form";
import { createSiteAction, saveDraftAction } from "../../actions";

type PresetOption = { id: string; label: string; colors: string[] };

export function CreateSiteForm({
  clientId,
  presets,
}: {
  clientId: string;
  presets: PresetOption[];
}) {
  const [state, action] = useActionState(createSiteAction.bind(null, clientId), {} as FormState);
  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <fieldset>
        <legend className="text-sm font-medium">Tema</legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          {presets.map((p, i) => (
            <label
              key={p.id}
              className="flex cursor-pointer flex-col gap-2 rounded-md border border-border p-3 has-checked:border-accent has-checked:ring-2 has-checked:ring-accent"
            >
              <span className="flex items-center gap-2">
                <input type="radio" name="preset" value={p.id} defaultChecked={i === 0} />
                <span className="font-medium">{p.label}</span>
              </span>
              <span aria-hidden="true" className="flex h-6 overflow-hidden rounded">
                {p.colors.map((c) => (
                  <span key={c} className="flex-1" style={{ background: c }} />
                ))}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Criando…">Criar site</SubmitButton>
      </div>
    </form>
  );
}

export function DraftEditor({ clientId, initial }: { clientId: string; initial: string }) {
  const [state, action] = useActionState(saveDraftAction.bind(null, clientId), {} as FormState);
  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <label htmlFor="document" className="text-sm font-medium">
        Documento do site (JSON)
      </label>
      <textarea
        id="document"
        name="document"
        defaultValue={valueOf(state, "document", initial)}
        rows={28}
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
