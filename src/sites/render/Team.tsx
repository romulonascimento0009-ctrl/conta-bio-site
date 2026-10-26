"use client";

import { useState } from "react";
import type { CatalogImage } from "./Catalog";
import { Icon } from "./Icon";

/**
 * "Meu time" (Reistyle, D52; protótipo `prototipos/bio-site-reistyle.html`): perfil da pessoa
 * escolhida (texto à esquerda, foto à direita) com o botão de agendar, e embaixo a fileira com
 * todas as pessoas. Fica dentro do painel aberto pelo cartão (SheetCard).
 */
export type TeamView = {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  skills?: string[];
  photo: CatalogImage | null;
  /** Destino do "Agendar" (WhatsApp com mensagem ou o grupo). */
  bookHref?: string;
  track: string;
};

function Photo({ image, sizes }: { image: CatalogImage | null; sizes: string }) {
  if (!image) return <span className="bio-team-nopic" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes próprias, sem next/image
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading="lazy"
      decoding="async"
    />
  );
}

export function TeamProfiles({ members }: { members: TeamView[] }) {
  const [id, setId] = useState(members[0].id);
  const m = members.find((x) => x.id === id) ?? members[0];
  return (
    <div className="bio-team">
      <article className="bio-team-profile" aria-live="polite">
        <div className="bio-team-txt">
          {m.role && <span className="bio-team-role">{m.role}</span>}
          <h3>{m.name}</h3>
          {m.bio && <p>{m.bio}</p>}
          {m.skills && m.skills.length > 0 && (
            <ul aria-label="Especialidades">
              {m.skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
        </div>
        <Photo image={m.photo} sizes="200px" />
      </article>
      {m.bookHref && (
        <a
          className="bio-send"
          href={m.bookHref}
          target="_blank"
          rel="noopener noreferrer"
          data-track={m.track}
        >
          <Icon name="whatsapp" /> Agendar com {m.name}
        </a>
      )}
      {members.length > 1 && (
        <ul className="bio-team-list">
          {members.map((x) => (
            <li key={x.id}>
              <button type="button" aria-pressed={x.id === m.id} onClick={() => setId(x.id)}>
                <Photo image={x.photo ? { ...x.photo, alt: "" } : null} sizes="120px" />
                <strong>{x.name}</strong>
                {x.role && <small>{x.role}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
