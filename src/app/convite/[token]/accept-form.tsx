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
import { MIN_CLIENT_PASSWORD_LENGTH } from "@/clients/invites";
import { acceptInviteAction } from "./actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(acceptInviteAction.bind(null, token), {} as FormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="text-sm font-medium">
          E-mail
        </label>
        <input
          id="invite-email"
          type="email"
          value={email}
          readOnly
          autoComplete="username"
          className={`${inputClass} bg-neutral-100`}
        />
      </div>
      <Field name="name" label="Seu nome" state={state}>
        {(a11y) => (
          <input
            {...a11y}
            autoComplete="name"
            required
            defaultValue={valueOf(state, "name", "")}
            className={inputClass}
          />
        )}
      </Field>
      <Field
        name="password"
        label="Crie uma senha"
        hint={`Pelo menos ${MIN_CLIENT_PASSWORD_LENGTH} caracteres.`}
        state={state}
      >
        {(a11y) => (
          <input
            {...a11y}
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        )}
      </Field>
      <Field name="confirm" label="Repita a senha" state={state}>
        {(a11y) => (
          <input
            {...a11y}
            type="password"
            autoComplete="new-password"
            required
            className={inputClass}
          />
        )}
      </Field>
      <SubmitButton pendingText="Criando acesso…">Criar acesso</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
