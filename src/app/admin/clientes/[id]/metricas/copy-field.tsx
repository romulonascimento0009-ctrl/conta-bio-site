"use client";

import { useId, useState } from "react";
import { inputClass } from "@/app/admin/_components/form";

/** Campo só de leitura com botão de copiar (links de QR code e NFC). */
export function CopyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const id = useId();
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          id={id}
          readOnly
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${inputClass} min-w-0 flex-1 font-mono text-xs`}
        />
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
          }}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}
