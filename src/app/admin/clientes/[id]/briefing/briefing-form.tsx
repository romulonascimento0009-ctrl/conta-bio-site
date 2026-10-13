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
import { BRIEFING_FIELDS, type Briefing } from "@/clients/briefing";
import { saveBriefingAction } from "../../actions";

export function BriefingForm({
  clientId,
  initial,
}: {
  clientId: string;
  initial: Partial<Briefing>;
}) {
  const [state, action] = useActionState(saveBriefingAction.bind(null, clientId), {} as FormState);
  return (
    <form action={action} className="mt-6 grid gap-5 md:grid-cols-2">
      {BRIEFING_FIELDS.map((f) => (
        <div key={f.name} className={f.multiline ? "md:col-span-2" : ""}>
          <Field name={f.name} label={f.label} hint={f.hint} state={state}>
            {(a) =>
              f.multiline ? (
                <textarea
                  {...a}
                  defaultValue={valueOf(state, f.name, initial[f.name])}
                  rows={4}
                  className={inputClass}
                />
              ) : (
                <input
                  {...a}
                  defaultValue={valueOf(state, f.name, initial[f.name])}
                  className={inputClass}
                />
              )
            }
          </Field>
        </div>
      ))}
      <div className="flex flex-col gap-3 md:col-span-2">
        <FormMessage state={state} />
        <div>
          <SubmitButton>Salvar briefing</SubmitButton>
        </div>
      </div>
    </form>
  );
}
