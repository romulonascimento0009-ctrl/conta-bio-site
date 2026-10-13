"use client";

import { useActionState, useState } from "react";
import {
  Field,
  FormMessage,
  inputClass,
  SubmitButton,
  type FormState,
} from "@/app/admin/_components/form";
import { slugify } from "@/clients/slug";
import { createClientAction } from "../actions";

export function NewClientForm() {
  const [state, action] = useActionState(createClientAction, {} as FormState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

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
        name="slug"
        label="Endereço do site"
        hint="Será usado como subdomínio: endereço.seudominio"
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
