"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
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

/**
 * Cartão que abre um painel por cima da página (galeria "Meus trabalhos", "Feedback de clientes").
 * Na prévia do editor o toque só seleciona o bloco (o painel não abre).
 */
export function SheetCard({
  className,
  style,
  track,
  blockId,
  title,
  trigger,
  children,
}: {
  className: string;
  style?: CSSProperties;
  track: string;
  blockId: string;
  title: string;
  trigger: ReactNode;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button
        type="button"
        className={className}
        style={style}
        data-track={track}
        data-block-id={blockId}
        aria-haspopup="dialog"
        onClick={(e) => {
          if (!e.currentTarget.closest(".bio--embedded")) ref.current?.showModal();
        }}
      >
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="bio-sheet"
        aria-labelledby={titleId}
        onClick={(e) => {
          // Toque fora do painel (no fundo escurecido) fecha.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
      >
        <div className="bio-sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" aria-label="Fechar" onClick={() => ref.current?.close()}>
            ×
          </button>
        </div>
        <div className="bio-sheet-body">{children}</div>
      </dialog>
    </>
  );
}

/**
 * Métricas do endereço público: avisa a visita (com a origem `?o=qr|nfc`, que depois some do
 * endereço) e cada toque em algo marcado com `data-track`. Sem cookies; `sendBeacon` não atrasa
 * a abertura do link. Não aparece na prévia nem no editor.
 */
/**
 * Origem lida uma vez por carregamento de página: o React de desenvolvimento roda o efeito duas
 * vezes, e na segunda o `?o=` já saiu do endereço (e a visita já foi contada).
 */
const pageOrigin = new Map<string, string | null>();

export function Tracker({ slug }: { slug: string }) {
  useEffect(() => {
    const send = (body: Record<string, string>) => {
      const data = new Blob([JSON.stringify({ s: slug, ...body })], { type: "application/json" });
      navigator.sendBeacon?.("/api/m", data);
    };
    if (!pageOrigin.has(slug)) {
      const url = new URL(window.location.href);
      const param = url.searchParams.get("o");
      pageOrigin.set(slug, param);
      if (param) {
        // Quem compartilhar o endereço depois não leva junto a marca do QR/NFC.
        url.searchParams.delete("o");
        window.history.replaceState(window.history.state, "", url);
      }
      send({ t: "v", ...(param ? { o: param } : {}), r: document.referrer });
    }
    const origin = pageOrigin.get(slug);
    const context = { ...(origin ? { o: origin } : {}), r: document.referrer };

    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]");
      if (el?.dataset.track) send({ t: "c", k: el.dataset.track, ...context });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, [slug]);
  return null;
}
