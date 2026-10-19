"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import {
  Field,
  FormMessage,
  inputClass,
  valueOf,
  type FormState,
} from "@/app/admin/_components/form";
import type { QuickEdit } from "@/sites/quick-edit";
import { quickEditAction } from "../../actions";

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-md border border-border p-4">
      <legend className="px-1 font-semibold">{title}</legend>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function Buttons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        name="intent"
        value="publish"
        disabled={pending}
        className="rounded-md bg-accent px-5 py-2.5 font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar e publicar"}
      </button>
      <button
        type="submit"
        name="intent"
        value="draft"
        disabled={pending}
        className="rounded-md border border-border bg-white px-5 py-2.5 font-medium disabled:opacity-60"
      >
        Salvar rascunho
      </button>
    </div>
  );
}

export function QuickEditForm({ clientId, initial }: { clientId: string; initial: QuickEdit }) {
  const [state, action] = useActionState(quickEditAction.bind(null, clientId), {} as FormState);
  const text = (name: keyof QuickEdit) => valueOf(state, name, String(initial[name]));
  const checked = (name: "tickerEnabled" | "tickerCustomColors") =>
    state.values ? state.values[name] === "on" : initial[name];

  return (
    <form action={action} className="mt-6 grid gap-6">
      <Group title="Instagram e Google">
        <Field
          name="instagram"
          label="Instagram"
          hint="Cole o link do perfil ou escreva o @perfil"
          state={state}
        >
          {(a) => <input {...a} defaultValue={text("instagram")} className={inputClass} />}
        </Field>
        <Field
          name="googleReviewUrl"
          label="Link para avaliar no Google"
          hint="Perfil da Empresa no Google → Pedir avaliações → copiar link"
          state={state}
        >
          {(a) => (
            <input
              {...a}
              inputMode="url"
              defaultValue={text("googleReviewUrl")}
              className={inputClass}
            />
          )}
        </Field>
        <Field name="googleRating" label="Nota no Google" hint="Opcional. Ex.: 4,8" state={state}>
          {(a) => (
            <input
              {...a}
              inputMode="decimal"
              defaultValue={text("googleRating")}
              className={inputClass}
            />
          )}
        </Field>
        <Field
          name="googleReviewCount"
          label="Número de avaliações"
          hint="Opcional. Ex.: 312"
          state={state}
        >
          {(a) => (
            <input
              {...a}
              inputMode="numeric"
              defaultValue={text("googleReviewCount")}
              className={inputClass}
            />
          )}
        </Field>
      </Group>

      <Group title="Contato">
        <Field
          name="whatsapp"
          label="WhatsApp"
          hint="Cole o link (wa.me/…) ou escreva o número com DDD"
          state={state}
        >
          {(a) => (
            <input {...a} type="tel" defaultValue={text("whatsapp")} className={inputClass} />
          )}
        </Field>
        <Field name="phone" label="Telefone" hint="Opcional" state={state}>
          {(a) => <input {...a} type="tel" defaultValue={text("phone")} className={inputClass} />}
        </Field>
      </Group>

      <Group title="Wi-Fi">
        <Field
          name="wifiNetwork"
          label="Nome da rede"
          hint="Deixe vazio para não mostrar o Wi-Fi"
          state={state}
        >
          {(a) => (
            <input
              {...a}
              defaultValue={text("wifiNetwork")}
              autoComplete="off"
              className={inputClass}
            />
          )}
        </Field>
        <Field
          name="wifiPassword"
          label="Senha"
          hint="Fica visível para quem abrir o Bio Site"
          state={state}
        >
          {(a) => (
            <input
              {...a}
              defaultValue={text("wifiPassword")}
              autoComplete="off"
              className={inputClass}
            />
          )}
        </Field>
      </Group>

      <Group title="Horários">
        <div className="sm:col-span-2">
          <Field
            name="hours"
            label="Um período por linha"
            hint="Ex.: Seg a sex | 8h – 18h"
            state={state}
          >
            {(a) => (
              <textarea {...a} rows={4} defaultValue={text("hours")} className={inputClass} />
            )}
          </Field>
        </div>
      </Group>

      <Group title="Faixa de aviso">
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="tickerEnabled"
            defaultChecked={checked("tickerEnabled")}
            className="size-5"
          />
          <span className="font-medium">Mostrar a faixa</span>
        </label>
        <div className="sm:col-span-2">
          <Field
            name="tickerItems"
            label="Frases (uma por linha)"
            hint="Até 60 caracteres cada"
            state={state}
          >
            {(a) => (
              <textarea {...a} rows={3} defaultValue={text("tickerItems")} className={inputClass} />
            )}
          </Field>
        </div>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            name="tickerCustomColors"
            defaultChecked={checked("tickerCustomColors")}
            className="size-5"
          />
          <span>Usar cores próprias (senão, as cores do tema)</span>
        </label>
        <Field name="tickerBg" label="Cor do fundo" state={state}>
          {(a) => (
            <input
              {...a}
              type="color"
              defaultValue={text("tickerBg")}
              className="h-10 w-20 rounded border border-border"
            />
          )}
        </Field>
        <Field name="tickerFg" label="Cor da letra" state={state}>
          {(a) => (
            <input
              {...a}
              type="color"
              defaultValue={text("tickerFg")}
              className="h-10 w-20 rounded border border-border"
            />
          )}
        </Field>
      </Group>

      <Group title="Localização (último cartão)">
        <Field name="address" label="Endereço" state={state}>
          {(a) => <input {...a} defaultValue={text("address")} className={inputClass} />}
        </Field>
        <Field
          name="mapsUrl"
          label="Link do mapa"
          hint="Opcional. Sem link, usamos o Google Maps com o endereço"
          state={state}
        >
          {(a) => (
            <input {...a} inputMode="url" defaultValue={text("mapsUrl")} className={inputClass} />
          )}
        </Field>
      </Group>

      <div className="sticky bottom-0 -mx-4 flex flex-col gap-2 border-t border-border bg-background px-4 py-3">
        <FormMessage state={state} />
        <Buttons />
      </div>
    </form>
  );
}
