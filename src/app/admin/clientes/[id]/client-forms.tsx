"use client";

import { useActionState } from "react";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  valueOf,
  type FormState,
} from "@/app/admin/_components/form";
import { SEGMENT_IDS, SEGMENTS } from "@/clients/segments";
import { CLIENT_STATUSES, STATUS_LABEL } from "@/clients/status";
import type { Client } from "@/data/clients";
import { deleteClientAction, updateClientAction } from "../actions";

export function ClientForm({ client }: { client: Client }) {
  const [state, action] = useActionState(updateClientAction.bind(null, client.id), {} as FormState);
  return (
    <form action={action} className="mt-4 grid max-w-xl gap-5">
      <Field name="name" label="Nome" state={state}>
        {(a) => (
          <input
            {...a}
            defaultValue={valueOf(state, "name", client.name)}
            required
            className={inputClass}
          />
        )}
      </Field>
      <Field
        name="slug"
        label="Endereço do Bio Site"
        hint="Mudar o endereço quebra links já divulgados."
        state={state}
      >
        {(a) => (
          <input
            {...a}
            defaultValue={valueOf(state, "slug", client.slug)}
            required
            className={`${inputClass} font-mono`}
          />
        )}
      </Field>
      <Field name="segment" label="Segmento" state={state}>
        {(a) => (
          <select
            {...a}
            defaultValue={valueOf(state, "segment", client.segment)}
            className={inputClass}
          >
            {SEGMENT_IDS.map((s) => (
              <option key={s} value={s}>
                {SEGMENTS[s].label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field name="status" label="Situação" state={state}>
        {(a) => (
          <select
            {...a}
            defaultValue={valueOf(state, "status", client.status)}
            className={inputClass}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field name="notes" label="Anotações internas" state={state}>
        {(a) => (
          <textarea
            {...a}
            defaultValue={valueOf(state, "notes", client.notes)}
            rows={4}
            className={inputClass}
          />
        )}
      </Field>
      <FormMessage state={state} />
      <div>
        <SubmitButton>Salvar dados</SubmitButton>
      </div>
    </form>
  );
}

export function DeleteClientForm({ id, slug }: { id: string; slug: string }) {
  const [state, action] = useActionState(deleteClientAction.bind(null, id), {} as FormState);
  return (
    <form action={action} className="mt-4 grid max-w-xl gap-4">
      <Field name="confirm" label={`Para confirmar, digite o endereço: ${slug}`} state={state}>
        {(a) => <input {...a} autoComplete="off" className={`${inputClass} font-mono`} />}
      </Field>
      <div>
        <SubmitButton variant="danger" pendingText="Excluindo…">
          Excluir cliente definitivamente
        </SubmitButton>
      </div>
    </form>
  );
}
