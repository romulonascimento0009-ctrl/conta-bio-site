"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Compartilhar: usa o menu nativo do celular; no computador, copia o link. */
export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* usuário cancelou */
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" className="bio-tag" onClick={share}>
      <Icon name="share" />
      <span aria-live="polite">{copied ? "Link copiado" : "Compartilhar"}</span>
    </button>
  );
}

export function CopyButton({ value, label, done }: { value: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button type="button" className="bio-copy" onClick={copy}>
      <Icon name="wifi" />
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  );
}
