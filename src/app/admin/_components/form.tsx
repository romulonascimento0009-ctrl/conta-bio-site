"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Valores enviados, devolvidos em caso de erro: o React 19 limpa o formulário após cada envio. */
  values?: Record<string, string>;
};

/** Valor inicial de um campo: o que foi enviado (se houve erro) ou o salvo. */
export function valueOf(state: FormState, name: string, saved: string | undefined): string {
  return state.values?.[name] ?? saved ?? "";
}

export const inputClass =
  "w-full rounded-md border border-border bg-white px-3 py-2 aria-invalid:border-danger";

export function Field({
  name,
  label,
  hint,
  state,
  children,
}: {
  name: string;
  label: string;
  hint?: string;
  state?: FormState;
  /** Recebe os atributos de acessibilidade que ligam o campo ao rótulo, à dica e ao erro. */
  children: (a11y: {
    id: string;
    name: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => ReactNode;
}) {
  const error = state?.fieldErrors?.[name]?.[0];
  const id = `f-${name}`;
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children({
        id,
        name,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
}: {
  children: ReactNode;
  pendingText?: string;
  variant?: "primary" | "danger" | "secondary";
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-accent text-white",
    danger: "bg-danger text-white",
    secondary: "border border-border bg-white",
  }[variant];
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md px-4 py-2 font-medium disabled:opacity-60 ${styles}`}
    >
      {pending ? (pendingText ?? "Salvando…") : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  return (
    <p role="status" className={`min-h-5 text-sm ${state.ok ? "text-green-800" : "text-danger"}`}>
      {state.message}
    </p>
  );
}
