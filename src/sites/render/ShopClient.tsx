"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { CatalogImage } from "./Catalog";
import { Icon } from "./Icon";

/**
 * Partes interativas da Vitrine (protótipo `prototipos/bio-site-otica-brasileiro.html`):
 * destaques em círculo com visualizador em tela cheia e catálogo em grade com filtros e ficha do
 * produto (ângulos, zoom, pedir pelo WhatsApp). Na prévia do editor nada abre (o toque seleciona
 * o bloco). Métricas pelos `data-track` (ver `trackTargets`).
 */

const STORY_MS = 5000;
const ZOOM = 2.4;

const isEmbedded = (el: Element) => !!el.closest(".shop--embedded");
const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Pic({
  image,
  sizes,
  className,
  style,
  eager,
}: {
  image: CatalogImage;
  sizes: string;
  className?: string;
  style?: React.CSSProperties;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes próprias, sem next/image
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={image.alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={className}
      style={style}
      draggable={false}
    />
  );
}

/* ---------- Destaques ---------- */

export type StoryView = {
  id: string;
  name: string;
  cover: CatalogImage;
  slides: {
    id: string;
    image: CatalogImage;
    tag?: string;
    title?: string;
    text?: string;
    button?: { label: string; href: string };
  }[];
};

export function StoriesBar({
  blockId,
  title,
  items,
  brand,
}: {
  blockId: string;
  title: string;
  items: StoryView[];
  brand: { name: string; logo: CatalogImage | null };
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pos, setPos] = useState<{ i: number; j: number } | null>(null);
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  const titleId = useId();

  const close = useCallback(() => ref.current?.close(), []);
  const next = useCallback(() => {
    setPos((p) => {
      if (!p) return p;
      if (p.j < items[p.i].slides.length - 1) return { i: p.i, j: p.j + 1 };
      setSeen((s) => new Set(s).add(items[p.i].id));
      if (p.i < items.length - 1) return { i: p.i + 1, j: 0 };
      ref.current?.close();
      return p;
    });
  }, [items]);
  const prev = useCallback(() => {
    setPos((p) => {
      if (!p) return p;
      if (p.j > 0) return { i: p.i, j: p.j - 1 };
      if (p.i > 0) return { i: p.i - 1, j: items[p.i - 1].slides.length - 1 };
      return p;
    });
  }, [items]);

  // Troca sozinho a cada 5 s (parado para quem desligou as animações).
  useEffect(() => {
    if (!pos || reducedMotion()) return;
    const t = setTimeout(next, STORY_MS);
    return () => clearTimeout(t);
  }, [pos, next]);

  const story = pos ? items[pos.i] : null;
  const slide = story && pos ? story.slides[pos.j] : null;

  return (
    <section className="shop-stories" aria-label={title} data-block-id={blockId}>
      <ul>
        {items.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              className={seen.has(s.id) ? "seen" : undefined}
              data-track={`d:${blockId}:${s.id}`}
              aria-haspopup="dialog"
              onClick={(e) => {
                if (isEmbedded(e.currentTarget)) return;
                setPos({ i, j: 0 });
                ref.current?.showModal();
              }}
            >
              <span className="shop-ring">
                <span>
                  <Pic image={{ ...s.cover, alt: "" }} sizes="72px" />
                </span>
              </span>
              {s.name}
            </button>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        className="shop-story"
        aria-labelledby={titleId}
        onClose={() => {
          if (pos) setSeen((s) => new Set(s).add(items[pos.i].id));
          setPos(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") next();
          if (e.key === "ArrowLeft") prev();
        }}
      >
        {story && slide && pos && (
          <div className="shop-story-frame">
            <Pic
              key={`${story.id}-${slide.id}`}
              image={slide.image}
              sizes="(max-width: 480px) 100vw, 480px"
              className="shop-story-img"
              eager
            />
            <div className="shop-story-bars" aria-hidden="true">
              {story.slides.map((sl, k) => (
                <span key={sl.id}>
                  <i
                    key={`${pos.i}-${pos.j}`}
                    className={k < pos.j ? "done" : k === pos.j ? "now" : undefined}
                  />
                </span>
              ))}
            </div>
            <div className="shop-story-head">
              {brand.logo && <Pic image={{ ...brand.logo, alt: "" }} sizes="36px" />}
              <span>
                <strong id={titleId}>{story.name}</strong>
                <small>{brand.name}</small>
              </span>
              <button type="button" aria-label="Fechar destaque" onClick={close} autoFocus>
                ×
              </button>
            </div>
            <button
              type="button"
              className="shop-story-tap prev"
              aria-label="Quadro anterior"
              onClick={prev}
            />
            <button
              type="button"
              className="shop-story-tap next"
              aria-label="Próximo quadro"
              onClick={next}
            />
            {(slide.tag || slide.title || slide.text || slide.button) && (
              <div className="shop-story-body" aria-live="polite">
                {slide.tag && <span className="shop-tag">{slide.tag}</span>}
                {slide.title && <h2>{slide.title}</h2>}
                {slide.text && <p>{slide.text}</p>}
                {slide.button && (
                  <a
                    className="shop-story-cta"
                    href={slide.button.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-track={`dw:${blockId}:${story.id}`}
                  >
                    <Icon name="whatsapp" />
                    {slide.button.label}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </dialog>
    </section>
  );
}

/* ---------- Vitrine (catálogo em grade) ---------- */

export type ShopProductView = {
  catId: string;
  id: string;
  name: string;
  category: string;
  tags: string[];
  priceCents?: number;
  compareAtCents?: number;
  photos: { image: CatalogImage; label: string }[];
  orderHref: string;
};

const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Price({ p }: { p: ShopProductView }) {
  if (p.priceCents === undefined) return null;
  return (
    <span className="shop-price">
      {money(p.priceCents)}
      {p.compareAtCents !== undefined && (
        <s>
          <span className="shop-sr">de </span>
          {money(p.compareAtCents)}
        </s>
      )}
    </span>
  );
}

const discount = (p: ShopProductView) =>
  p.priceCents !== undefined && p.compareAtCents
    ? Math.round((1 - p.priceCents / p.compareAtCents) * 100)
    : 0;

export function ShopCatalog({
  blockId,
  title,
  subtitle,
  filters,
  products,
}: {
  blockId: string;
  title: string;
  subtitle?: string;
  filters: string[];
  products: ShopProductView[];
}) {
  const titleId = useId();
  const sheetTitle = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<ShopProductView | null>(null);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);

  const list = filter
    ? products.filter((p) => p.category === filter || p.tags.includes(filter))
    : products;

  const point = (e: ReactPointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    };
  };
  const goTo = (k: number) => {
    const el = stage.current;
    setZoom(null);
    el?.scrollTo({ left: k * el.clientWidth, behavior: reducedMotion() ? "auto" : "smooth" });
  };

  return (
    <section className="shop-catalog" aria-labelledby={titleId} data-block-id={blockId}>
      <div className="shop-head">
        <h2 id={titleId}>{title}</h2>
        <small aria-live="polite">
          {list.length} {list.length === 1 ? "modelo" : "modelos"}
        </small>
      </div>
      {subtitle && <p className="shop-sub">{subtitle}</p>}
      {filters.length > 0 && (
        <div className="shop-filters" role="group" aria-label={`Filtrar ${title.toLowerCase()}`}>
          {[null, ...filters].map((f) => (
            <button
              key={f ?? "*"}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f ?? "Todos"}
            </button>
          ))}
        </div>
      )}
      <ul className="shop-grid">
        {list.map((p) => {
          const off = discount(p);
          return (
            <li key={`${p.catId}:${p.id}`}>
              <button
                type="button"
                className="shop-product"
                aria-haspopup="dialog"
                data-track={`p:${p.catId}:${p.id}`}
                onClick={(e) => {
                  if (isEmbedded(e.currentTarget)) return;
                  setOpen(p);
                  setActive(0);
                  setZoom(null);
                  ref.current?.showModal();
                  stage.current?.scrollTo({ left: 0 });
                }}
              >
                <span className="shop-photo">
                  {off > 0 && <span className="shop-off">-{off}%</span>}
                  {p.photos[0] && (
                    <Pic image={p.photos[0].image} sizes="(max-width: 480px) 45vw, 220px" />
                  )}
                  {p.photos.length > 1 && (
                    <span className="shop-angles">
                      <Icon name="rotate" />
                      {p.photos.length}
                      <span className="shop-sr"> fotos</span>
                    </span>
                  )}
                </span>
                <strong>{p.name}</strong>
                <small>{p.category}</small>
                <Price p={p} />
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="shop-empty">Nenhum modelo neste filtro.</li>}
      </ul>

      <dialog
        ref={ref}
        className="shop-sheet"
        aria-labelledby={sheetTitle}
        onClick={(e) => {
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        onClose={() => {
          setOpen(null);
          setZoom(null);
        }}
      >
        {open && (
          <div className="shop-sheet-box">
            <button
              type="button"
              className="shop-close"
              aria-label="Fechar"
              onClick={() => ref.current?.close()}
            >
              ×
            </button>
            <div
              ref={stage}
              className={zoom ? "shop-stage zoomed" : "shop-stage"}
              onScroll={(e) => {
                const el = e.currentTarget;
                const k = Math.round(el.scrollLeft / el.clientWidth);
                if (k !== active) {
                  setActive(k);
                  setZoom(null);
                }
              }}
            >
              {open.photos.map((ph, k) => (
                <button
                  key={k}
                  type="button"
                  className="shop-view"
                  aria-label={`${ph.label}: ${zoom && k === active ? "toque para reduzir" : "toque para ampliar"}`}
                  onClick={(e) => {
                    if (zoom) setZoom(null);
                    else {
                      const r = e.currentTarget.getBoundingClientRect();
                      // Teclado (sem ponteiro): amplia o centro.
                      const fromKey = e.detail === 0;
                      setZoom(
                        fromKey
                          ? { x: 50, y: 50 }
                          : {
                              x: ((e.clientX - r.left) / r.width) * 100,
                              y: ((e.clientY - r.top) / r.height) * 100,
                            },
                      );
                    }
                  }}
                  onPointerMove={(e) => {
                    if (zoom && k === active) setZoom(point(e));
                  }}
                >
                  <Pic
                    image={ph.image}
                    sizes="(max-width: 480px) 100vw, 480px"
                    eager={k === 0}
                    style={
                      zoom && k === active
                        ? {
                            transform: `scale(${ZOOM})`,
                            transformOrigin: `${zoom.x}% ${zoom.y}%`,
                          }
                        : undefined
                    }
                  />
                </button>
              ))}
            </div>
            <p className="shop-hint">
              {open.photos.length > 1
                ? "Toque na foto para ampliar · deslize para ver outros ângulos"
                : "Toque na foto para ampliar"}
            </p>
            {open.photos.length > 1 && (
              <div className="shop-thumbs" role="group" aria-label="Ângulos">
                {open.photos.map((ph, k) => (
                  <button
                    key={k}
                    type="button"
                    aria-current={k === active ? "true" : undefined}
                    onClick={() => goTo(k)}
                  >
                    <Pic image={{ ...ph.image, alt: "" }} sizes="96px" />
                    <span>{ph.label}</span>
                  </button>
                ))}
              </div>
            )}
            <h2 id={sheetTitle}>{open.name}</h2>
            <small className="shop-cat">{open.category}</small>
            <Price p={open} />
            <a
              className="shop-order"
              href={open.orderHref}
              target="_blank"
              rel="noopener noreferrer"
              data-track={`w:${open.catId}:${open.id}`}
            >
              <Icon name="whatsapp" />
              Pedir pelo WhatsApp
            </a>
          </div>
        )}
      </dialog>
    </section>
  );
}
