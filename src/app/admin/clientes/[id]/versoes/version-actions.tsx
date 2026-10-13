"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/app/admin/_components/form";
import { publishVersionAction, restoreVersionAction } from "../../actions";

export function VersionActions({
  clientId,
  versionId,
  published,
}: {
  clientId: string;
  versionId: string;
  published: boolean;
}) {
  const [restoreState, restore] = useActionState(
    restoreVersionAction.bind(null, clientId, versionId),
    {} as FormState,
  );
  const [publishState, publish] = useActionState(
    publishVersionAction.bind(null, clientId, versionId),
    {} as FormState,
  );
  return (
    <div className="mt-3 flex flex-wrap items-start gap-4">
      <form action={restore} className="flex flex-col gap-1">
        <SubmitButton variant="secondary" pendingText="Restaurando…">
          Restaurar no rascunho
        </SubmitButton>
        <FormMessage state={restoreState} />
      </form>
      {/* Sempre presente (desativado se já publicada) para a confirmação não sumir. */}
      <form action={publish} className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="approve" disabled={published} className="size-4" />
          Aprovo republicar esta versão
        </label>
        {published ? (
          <button
            type="button"
            disabled
            className="rounded-md border border-border bg-white px-4 py-2 font-medium opacity-60"
          >
            Já publicada
          </button>
        ) : (
          <SubmitButton variant="secondary" pendingText="Publicando…">
            Republicar esta versão
          </SubmitButton>
        )}
        <FormMessage state={publishState} />
      </form>
    </div>
  );
}
