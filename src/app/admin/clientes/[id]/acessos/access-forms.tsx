"use client";

import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  valueOf,
  type FormState,
} from "@/app/admin/_components/form";
import { DEFAULT_INVITE_TTL_DAYS, INVITE_TTL_DAYS } from "@/clients/invites";
import {
  createInviteAction,
  removeMemberAction,
  revokeInviteAction,
  type InviteFormState,
} from "../../actions";

export function InviteForm({ clientId }: { clientId: string }) {
  const [state, action] = useActionState(
    createInviteAction.bind(null, clientId),
    {} as InviteFormState,
  );
  return (
    <div className="mt-4 grid max-w-xl gap-4">
      <form action={action} className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
        <Field name="email" label="E-mail de quem vai acessar" state={state}>
          {(a11y) => (
            <input
              {...a11y}
              type="email"
              autoComplete="off"
              required
              defaultValue={valueOf(state, "email", "")}
              className={inputClass}
            />
          )}
        </Field>
        <Field name="days" label="Validade do link" state={state}>
          {(a11y) => (
            <select
              {...a11y}
              defaultValue={valueOf(state, "days", String(DEFAULT_INVITE_TTL_DAYS))}
              className={inputClass}
            >
              {INVITE_TTL_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d === 1 ? "1 dia" : `${d} dias`}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="sm:col-span-2">
          <SubmitButton pendingText="Criando…">Criar convite</SubmitButton>
        </div>
      </form>
      <FormMessage state={state} />
      {state.link && <InviteLink key={state.link} link={state.link} />}
    </div>
  );
}

/** O link só aparece agora: o banco guarda apenas o hash do token. */
function InviteLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-2 rounded-md border border-accent/40 bg-white p-4">
      <label htmlFor="invite-link" className="text-sm font-medium">
        Link do convite
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id="invite-link"
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className={`${inputClass} min-w-0 flex-1 font-mono text-xs`}
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          }}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium"
        >
          {copied ? "Copiado" : "Copiar link"}
        </button>
      </div>
      <p className="text-sm text-muted">
        Envie por WhatsApp ou e-mail. Por segurança, o link não aparece de novo: se perder, cancele
        este convite e crie outro.
      </p>
    </div>
  );
}

export function RevokeInviteForm({
  clientId,
  inviteId,
  email,
}: {
  clientId: string;
  inviteId: string;
  email: string;
}) {
  const [state, action] = useActionState(
    revokeInviteAction.bind(null, clientId, inviteId),
    {} as FormState,
  );
  return (
    <form action={action} className="flex flex-col items-start gap-1">
      <button
        type="submit"
        aria-label={`Cancelar convite de ${email}`}
        className="rounded-md border border-border bg-white px-3 py-1.5 text-sm"
      >
        Cancelar convite
      </button>
      <FormMessage state={state} />
    </form>
  );
}

export function RemoveMemberForm({
  clientId,
  userId,
  email,
}: {
  clientId: string;
  userId: string;
  email: string;
}) {
  const [state, action] = useActionState(
    removeMemberAction.bind(null, clientId, userId),
    {} as FormState,
  );
  return (
    <form action={action} className="flex flex-col items-start gap-2">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" className="size-4" />
        Confirmo remover o acesso de {email}
      </label>
      <SubmitButton variant="danger" pendingText="Removendo…">
        Remover acesso
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
