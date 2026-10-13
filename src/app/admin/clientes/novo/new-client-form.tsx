"use client";

import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  type FormState,
} from "@/app/admin/_components/form";
import { SEGMENT_IDS, SEGMENTS } from "@/clients/segments";
import { slugify } from "@/clients/slug";
import { createClientAction } from "../actions";

export function NewClientForm() {
  const [state, action] = useActionState(createClientAction, {} as FormState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [segment, setSegment] = useState("");

  return (
    <form action={action} className="mt-6 flex flex-col gap-5">
      <Field name="name" label="Nome do cliente" state={state}>
        {(a) => (
          <input
            {...a}
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            className={inputClass}
          />
        )}
      </Field>
      <Field
        name="segment"
        label="Segmento"
        hint="Define o modelo inicial do Bio Site"
        state={state}
      >
        {(a) => (
          // Controlado: o React limpa o formulário após cada envio e um <select> não
          // volta sozinho ao valor anterior em caso de erro.
          <select
            {...a}
            required
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Escolha…
            </option>
            {SEGMENT_IDS.map((s) => (
              <option key={s} value={s}>
                {SEGMENTS[s].label}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field
        name="slug"
        label="Endereço do Bio Site"
        hint="Fica em seudominio.com/endereço"
        state={state}
      >
        {(a) => (
          <input
            {...a}
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugEdited(true);
            }}
            className={`${inputClass} font-mono`}
          />
        )}
      </Field>
      <FormMessage state={state} />
      <div>
        <SubmitButton pendingText="Criando…">Criar cliente</SubmitButton>
      </div>
    </form>
  );
}
