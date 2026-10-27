"use client";

import { useEffect, useId, useRef, useState } from "react";

export type VideoTile = {
  src: string;
  type: string;
  poster: string | null;
  title?: string;
};

/**
 * Vídeos em destaque ("Meus trabalhos", Casa Limpa): até 6 vídeos lado a lado num quadro. O
 * primeiro toca sozinho, sem som e em repetição (`autoplay`; parado para quem desligou as
 * animações); os outros mostram a capa. Tocar em qualquer um abre o vídeo grande, com som.
 * Na prévia do editor o toque só seleciona o bloco.
 */
export function VideoTiles({
  blockId,
  title,
  subtitle,
  videos,
  autoplay,
}: {
  blockId: string;
  title: string;
  subtitle?: string;
  videos: VideoTile[];
  autoplay: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const player = useRef<HTMLVideoElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const [open, setOpen] = useState<VideoTile | null>(null);
  const titleId = useId();
  const headId = useId();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) preview.current?.pause();
  }, []);

  function close() {
    player.current?.pause();
    ref.current?.close();
  }

  return (
    <section className="bio-panel bio-videos" aria-labelledby={headId} data-block-id={blockId}>
      <div className="bio-videos-head">
        <svg viewBox="-10 -10 20 20" aria-hidden="true">
          <path d="M0-10C1-3 3-1 10 0C3 1 1 3 0 10C-1 3-3 1-10 0C-3-1-1-3 0-10Z" />
        </svg>
        <h2 id={headId}>{title}</h2>
        {subtitle && <small>{subtitle}</small>}
      </div>
      <ul className="bio-videos-grid" data-count={Math.min(videos.length, 3)}>
        {videos.map((v, i) => (
          <li key={i}>
            <button
              type="button"
              data-track={`v:${blockId}:${i}`}
              aria-haspopup="dialog"
              aria-label={`Assistir: ${v.title ?? `vídeo ${i + 1}`}`}
              onClick={(e) => {
                if (e.currentTarget.closest(".bio--embedded")) return;
                setOpen(v);
                ref.current?.showModal();
              }}
            >
              {i === 0 && autoplay ? (
                <video
                  ref={preview}
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  poster={v.poster ?? undefined}
                  aria-hidden="true"
                >
                  <source src={v.src} type={v.type} />
                </video>
              ) : (
                v.poster && (
                  // eslint-disable-next-line @next/next/no-img-element -- capa do vídeo (variante própria)
                  <img src={v.poster} alt="" loading="lazy" decoding="async" />
                )
              )}
              <span className="bio-videos-play" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M7 4.5l13 7.5-13 7.5z" />
                </svg>
              </span>
              {v.title && <span className="bio-videos-cap">{v.title}</span>}
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        className="bio-sheet"
        aria-labelledby={titleId}
        onClose={() => {
          player.current?.pause();
          setOpen(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="bio-sheet-head">
          <h2 id={titleId}>{open?.title ?? title}</h2>
          <button type="button" aria-label="Fechar" onClick={close}>
            ×
          </button>
        </div>
        <div className="bio-sheet-body">
          {open && (
            <video
              key={open.src}
              ref={player}
              className="bio-videos-player"
              controls
              playsInline
              autoPlay
              poster={open.poster ?? undefined}
            >
              <source src={open.src} type={open.type} />
            </video>
          )}
        </div>
      </dialog>
    </section>
  );
}
