"use client";

import { useActionState } from "react";
import {
  FormMessage,
  inputClass,
  SubmitButton,
  valueOf,
  type FormState,
} from "@/app/admin/_components/form";
import { deleteAssetAction, updateAltAction } from "../../actions";

type AssetSummary = { id: string; alt: string; width: number; height: number; name: string };

export function AssetCard({
  clientId,
  asset,
  thumbUrl,
}: {
  clientId: string;
  asset: AssetSummary;
  thumbUrl: string;
}) {
  const [altState, altAction] = useActionState(
    updateAltAction.bind(null, clientId, asset.id),
    {} as FormState,
  );
  const [delState, delAction] = useActionState(
    deleteAssetAction.bind(null, clientId, asset.id),
    {} as FormState,
  );
  const altId = `alt-${asset.id}`;

  return (
    <div className="rounded-md border border-border p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura de variante própria */}
      <img
        src={thumbUrl}
        alt=""
        width={asset.width}
        height={asset.height}
        className="aspect-4/3 w-full rounded object-cover"
      />
      <p className="mt-2 truncate text-xs text-muted" title={asset.name}>
        {asset.name} · {asset.width}×{asset.height}
      </p>
      <p className="mt-1 font-mono text-xs break-all text-muted">id: {asset.id}</p>
      <form action={altAction} className="mt-3 flex flex-col gap-2">
        <label htmlFor={altId} className="text-sm font-medium">
          Descrição (texto alternativo)
        </label>
        <input
          id={altId}
          name="alt"
          defaultValue={valueOf(altState, "alt", asset.alt)}
          className={inputClass}
        />
        <div className="flex items-center gap-3">
          <SubmitButton variant="secondary">Salvar descrição</SubmitButton>
        </div>
        <FormMessage state={altState} />
      </form>
      <form action={delAction} className="mt-1">
        <SubmitButton variant="secondary" pendingText="Excluindo…">
          Excluir imagem
        </SubmitButton>
        <FormMessage state={delState} />
      </form>
    </div>
  );
}
