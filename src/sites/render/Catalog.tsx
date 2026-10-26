"use client";

import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { encodeOrder } from "@/sites/catalog";
import { whatsappHref } from "@/sites/links";
import { Icon } from "./Icon";

/**
 * Catálogo com carrinho (protótipo `prototipos/bio-site-mage-beauty.html`): vitrine de categorias
 * em 2 colunas; cada categoria abre seus produtos; "Adicionar" põe no pedido, que acompanha a
 * pessoa entre as categorias e vai inteiro para o WhatsApp do cliente. O pedido fica guardado só
 * neste navegador (localStorage), sem cadastro nem pagamento no site. Métricas pelos `data-track`
 * (categoria, primeiro "Adicionar" de cada produto, envio) — ver `trackTargets`.
 *
 * Modo "book" (Reistyle, D51): serviços com preço e botão "Agendar" em cada um, sem carrinho.
 * Produto com mais fotos e vídeos: tocar na foto abre o visualizador (desliza para o lado).
 */

export type CatalogImage = {
  src: string;
  srcSet: string;
  width: number;
  height: number;
  alt: string;
};
/** Foto ou vídeo do visualizador (vídeo com capa e dimensões para reservar o espaço). */
export type CatalogMedia =
  | ({ kind: "image"; caption?: string } & CatalogImage)
  | {
      kind: "video";
      src: string;
      type: string;
      poster: string | null;
      width: number;
      height: number;
      caption?: string;
    };
export type CatalogView = {
  id: string;
  name: string;
  tag?: string;
  cover: CatalogImage | null;
  products: {
    id: string;
    name: string;
    priceCents?: number;
    image: CatalogImage | null;
    /** Foto principal + mais fotos e vídeos (só quando há mais de um item). */
    media?: CatalogMedia[];
    /** Modo "book": destino do botão "Agendar". */
    bookHref?: string;
  }[];
};

const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Cart = Record<string, number>;

function Pic({ image, sizes }: { image: CatalogImage | null; sizes: string }) {
  if (!image) return <span className="bio-shop-nopic" />;
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

function Stepper({ label, qty, set }: { label: string; qty: number; set: (q: number) => void }) {
  return (
    <div className="bio-step" role="group" aria-label={`Quantidade de ${label}`}>
      <button type="button" aria-label="Tirar um" onClick={() => set(qty - 1)}>
        −
      </button>
      <output aria-live="polite">{qty}</output>
      <button type="button" aria-label="Mais um" onClick={() => set(qty + 1)}>
        +
      </button>
    </div>
  );
}

/** Fotos e vídeos de um produto, deslizando para o lado; só o vídeo à vista toca. */
function MediaViewer({ items }: { items: CatalogMedia[] }) {
  const [at, setAt] = useState(0);
  return (
    <>
      {/* Faixa que desliza para o lado: focável e nomeada (teclado e leitores de tela). */}
      <div
        className="bio-media"
        role="region"
        aria-label="Fotos e vídeos"
        tabIndex={0}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i === at) return;
          setAt(i);
          el.querySelectorAll("video").forEach((v, j) => j !== i && v.pause());
        }}
      >
        {items.map((m, i) => (
          <figure key={i}>
            {m.kind === "video" ? (
              <video
                poster={m.poster ?? undefined}
                width={m.width}
                height={m.height}
                controls
                playsInline
                preload="none"
              >
                <source src={m.src} type={m.type} />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- variantes próprias, sem next/image
              <img
                src={m.src}
                srcSet={m.srcSet}
                sizes="(max-width: 480px) 100vw, 440px"
                width={m.width}
                height={m.height}
                alt={m.alt}
                loading="lazy"
                decoding="async"
              />
            )}
            {m.caption && <figcaption>{m.caption}</figcaption>}
          </figure>
        ))}
      </div>
      {items.length > 1 && (
        <p className="bio-media-dots" aria-live="polite">
          {at + 1} de {items.length} · deslize para o lado
        </p>
      )}
    </>
  );
}

export function Catalog({
  blockId,
  title,
  subtitle,
  categories,
  whatsapp,
  intro,
  storageKey,
  orderBase,
  mode = "order",
}: {
  blockId: string;
  title: string;
  subtitle?: string;
  categories: CatalogView[];
  /** Modo "order": número do WhatsApp que recebe o pedido. */
  whatsapp?: string;
  mode?: "order" | "book";
  /** Primeira linha da mensagem (ex.: "Oi! Vim pelo Bio Site da Loja e quero fazer este pedido:"). */
  intro: string;
  storageKey: string;
  /** Endereço da página "Fotos do pedido" (só no site publicado; ausente na prévia). */
  orderBase?: string;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const catRef = useRef<HTMLDialogElement>(null);
  const cartRef = useRef<HTMLDialogElement>(null);
  const viewRef = useRef<HTMLDialogElement>(null);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const viewTitleId = useId();
  const [cart, setCart] = useState<Cart>({});
  const titleId = useId();
  const catTitleId = useId();
  const cartTitleId = useId();

  const find = (key: string) => {
    const [c, p] = key.split(":");
    const cat = categories.find((x) => x.id === c);
    const prod = cat?.products.find((x) => x.id === p);
    return cat && prod ? { cat, prod } : null;
  };

  // Pedido guardado neste navegador; itens que saíram do catálogo são descartados.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Cart;
      const valid = Object.fromEntries(
        Object.entries(saved).filter(
          ([k, q]) => Number.isInteger(q) && q > 0 && q < 100 && find(k),
        ),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect -- leitura única do armazenamento local
      setCart(valid);
    } catch {
      /* armazenamento indisponível: começa vazio */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só ao abrir a página
  }, [storageKey]);

  const keys = Object.keys(cart).filter((k) => find(k));
  const count = keys.reduce((n, k) => n + cart[k], 0);
  const priced = keys.every((k) => find(k)!.prod.priceCents !== undefined);
  const total = keys.reduce((s, k) => s + (find(k)!.prod.priceCents ?? 0) * cart[k], 0);

  // Com itens no pedido, a barra do carrinho ocupa o lugar do botão flutuante do WhatsApp.
  useEffect(() => {
    rootRef.current?.closest(".bio")?.classList.toggle("bio--has-cart", count > 0);
  }, [count]);

  function setQty(key: string, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty > 0) next[key] = Math.min(qty, 99);
      else delete next[key];
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* sem armazenamento: o pedido vale só enquanto a página estiver aberta */
      }
      return next;
    });
  }

  const embedded = () => !!rootRef.current?.closest(".bio--embedded");
  function showCategory(id: string) {
    setOpenCat(id);
    if (!embedded()) catRef.current?.showModal();
  }
  function showMedia(key: string) {
    setViewing(key);
    if (!embedded()) viewRef.current?.showModal();
  }
  function showCart() {
    catRef.current?.close();
    if (!embedded()) cartRef.current?.showModal();
  }

  const message = [
    intro,
    "",
    ...keys.map((k) => {
      const { cat, prod } = find(k)!;
      const price = prod.priceCents !== undefined ? ` — ${money(prod.priceCents * cart[k])}` : "";
      return `• ${cart[k]}x ${prod.name} (${cat.name})${price}`;
    }),
    // Total só quando todos têm preço (sem preço, ele está na descrição da foto).
    ...(priced ? ["", `Total: ${money(total)}`] : []),
    // O WhatsApp não aceita anexo por link: as fotos vão numa página do pedido, com prévia.
    ...(orderBase
      ? [
          "",
          `📷 Fotos do pedido: ${orderBase}?i=${encodeOrder(
            keys.map((k) => {
              const [cat, prod] = k.split(":");
              return { cat, prod, qty: cart[k] };
            }),
          )}`,
        ]
      : []),
  ].join("\n");

  const summary = priced ? money(total) : `${count} ${count === 1 ? "item" : "itens"}`;
  const cartBar = (inSheet: boolean) =>
    count > 0 && (
      <button
        type="button"
        className={`bio-cartbar${inSheet ? " in-sheet" : ""}`}
        onClick={showCart}
        aria-haspopup="dialog"
      >
        <span className="bio-cartbar-n">{count}</span>
        <span className="bio-cartbar-txt">
          <strong>Seu pedido</strong>
          <small>{summary}</small>
        </span>
        <span className="bio-cartbar-go">Ver pedido</span>
      </button>
    );

  const cat = categories.find((c) => c.id === openCat);
  const view = viewing ? find(viewing) : null;
  const book = mode === "book";
  const hasMedia = categories.some((c) => c.products.some((p) => p.media));
  const outside = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  };

  return (
    <section ref={rootRef} className="bio-shop" aria-labelledby={titleId} data-block-id={blockId}>
      <h2 id={titleId}>{title}</h2>
      {subtitle && <p className="bio-shop-hint">{subtitle}</p>}
      <ul className="bio-shop-grid">
        {categories.map((c) => {
          const inCart = keys
            .filter((k) => k.startsWith(`${c.id}:`))
            .reduce((n, k) => n + cart[k], 0);
          return (
            <li key={c.id}>
              <button
                type="button"
                className="bio-shop-cat"
                data-track={`k:${c.id}`}
                aria-haspopup="dialog"
                onClick={() => showCategory(c.id)}
              >
                <span className="bio-shop-pic">
                  <Pic image={c.cover} sizes="(max-width: 480px) 50vw, 220px" />
                  {c.tag && <span className="bio-shop-tag">{c.tag}</span>}
                  {inCart > 0 && (
                    <span className="bio-shop-count" aria-label={`${inCart} no pedido`}>
                      {inCart}
                    </span>
                  )}
                </span>
                <strong>{c.name}</strong>
                <span className="bio-shop-cta">
                  {/* mesmos nós de texto de antes no modo pedido (HTML da Mage inalterado) */}
                  {book ? (
                    <>Ver serviços ({c.products.length})</>
                  ) : (
                    <>Ver produtos ({c.products.length})</>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!book && cartBar(false)}

      <dialog
        ref={catRef}
        className="bio-sheet bio-shop-sheet"
        aria-labelledby={catTitleId}
        onClick={outside}
        onClose={() => setOpenCat(null)}
      >
        <div className="bio-sheet-head">
          <h2 id={catTitleId}>{cat?.name}</h2>
          <button type="button" aria-label="Fechar" onClick={() => catRef.current?.close()}>
            ×
          </button>
        </div>
        <div className="bio-sheet-body">
          <ul className="bio-prods">
            {cat?.products.map((p) => {
              const key = `${cat.id}:${p.id}`;
              const qty = cart[key] ?? 0;
              return (
                <li key={p.id} className="bio-prod">
                  {p.media ? (
                    <button
                      type="button"
                      className="bio-prod-pic"
                      aria-haspopup="dialog"
                      aria-label={`Ver fotos e vídeos: ${p.name}`}
                      onClick={() => showMedia(key)}
                    >
                      <Pic image={p.image} sizes="(max-width: 480px) 50vw, 220px" />
                      {p.media.some((m) => m.kind === "video") && (
                        <span className="bio-play" aria-hidden="true" />
                      )}
                      <span className="bio-media-n" aria-hidden="true">
                        {p.media.length}
                      </span>
                    </button>
                  ) : (
                    <Pic image={p.image} sizes="(max-width: 480px) 50vw, 220px" />
                  )}
                  <span className="bio-prod-info">
                    <strong>{p.name}</strong>
                    {p.priceCents !== undefined && (
                      <span className="bio-prod-price">{money(p.priceCents)}</span>
                    )}
                  </span>
                  <span className="bio-prod-act">
                    {book ? (
                      <a
                        className="bio-add"
                        href={p.bookHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-track={`p:${cat.id}:${p.id}`}
                      >
                        Agendar
                      </a>
                    ) : qty > 0 ? (
                      <Stepper label={p.name} qty={qty} set={(q) => setQty(key, q)} />
                    ) : (
                      <button
                        type="button"
                        className="bio-add"
                        data-track={`p:${cat.id}:${p.id}`}
                        onClick={() => setQty(key, 1)}
                      >
                        Adicionar
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {!book && cartBar(true)}
      </dialog>

      {hasMedia && (
        <dialog
          ref={viewRef}
          className="bio-sheet bio-shop-sheet"
          aria-labelledby={viewTitleId}
          onClick={outside}
          onClose={(e) => {
            e.currentTarget.querySelectorAll("video").forEach((v) => v.pause());
            setViewing(null);
          }}
        >
          <div className="bio-sheet-head">
            <h2 id={viewTitleId}>{view?.prod.name}</h2>
            <button type="button" aria-label="Fechar" onClick={() => viewRef.current?.close()}>
              ×
            </button>
          </div>
          <div className="bio-sheet-body">
            {view?.prod.media && <MediaViewer key={viewing} items={view.prod.media} />}
            {book && view?.prod.bookHref && (
              <a
                className="bio-send"
                href={view.prod.bookHref}
                target="_blank"
                rel="noopener noreferrer"
                data-track={`p:${view.cat.id}:${view.prod.id}`}
              >
                <Icon name="whatsapp" /> Agendar {view.prod.name}
              </a>
            )}
          </div>
        </dialog>
      )}

      {!book && (
        <dialog
          ref={cartRef}
          className="bio-sheet bio-shop-sheet"
          aria-labelledby={cartTitleId}
          onClick={outside}
        >
          <div className="bio-sheet-head">
            <h2 id={cartTitleId}>Seu pedido</h2>
            <button type="button" aria-label="Fechar" onClick={() => cartRef.current?.close()}>
              ×
            </button>
          </div>
          <div className="bio-sheet-body">
            {keys.length === 0 ? (
              <p className="bio-cart-empty">Nenhum produto escolhido.</p>
            ) : (
              <>
                <ul className="bio-cart">
                  {keys.map((k) => {
                    const { cat: c, prod } = find(k)!;
                    return (
                      <li key={k}>
                        <Pic image={prod.image} sizes="56px" />
                        <span className="bio-cart-name">
                          <strong>{prod.name}</strong>
                          <small>
                            {c.name}
                            {prod.priceCents !== undefined ? ` · ${money(prod.priceCents)}` : ""}
                          </small>
                        </span>
                        <Stepper label={prod.name} qty={cart[k]} set={(q) => setQty(k, q)} />
                      </li>
                    );
                  })}
                </ul>
                {priced && (
                  <p className="bio-cart-total">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </p>
                )}
                <a
                  className="bio-send"
                  href={whatsappHref(whatsapp ?? "", message)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track="order"
                >
                  <Icon name="whatsapp" /> Enviar pedido pelo WhatsApp
                </a>
              </>
            )}
          </div>
        </dialog>
      )}
    </section>
  );
}
