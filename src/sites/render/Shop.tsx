import type { CSSProperties, ReactNode } from "react";
import { resolveLink, type Block, type BlockOf } from "@/sites/bio";
import { ICONS } from "@/sites/icons";
import { cardSubtitle, whatsappHref, whatsappTarget } from "@/sites/links";
import { Tracker } from "./client-buttons";
import { Icon } from "./Icon";
import { catalogImage, Img, type Ctx } from "./shared";
import { ShopCatalog, StoriesBar, type ShopProductView, type StoryView } from "./ShopClient";
import "./shop.css";

/**
 * Vitrine (D57, Ótica do Brasileiro): página de loja no lugar dos cartões. Topo compacto,
 * destaques em círculo, ofertas, catálogo em grade e cartões claros, sobre um degradê suave
 * (Cor 1 → fundo → Cor 2). Blocos que a Vitrine não desenha (Wi-Fi, Pix, galeria, equipe,
 * orçamento, vídeos) ficam de fora — o editor avisa.
 */

export const SHOP_BLOCKS: readonly Block["type"][] = [
  "stories",
  "promos",
  "catalog",
  "text",
  "hours",
  "link",
];

function Stories({ ctx, block }: { ctx: Ctx; block: BlockOf<"stories"> }) {
  const { doc } = ctx;
  const items: StoryView[] = [];
  for (const s of block.items) {
    const cover = catalogImage(ctx, s.cover, "");
    const slides: StoryView["slides"] = [];
    for (const sl of s.slides) {
      const image = catalogImage(ctx, sl.image, sl.image.alt);
      if (!image) continue;
      const msg = `Oi! Vi o destaque “${sl.title ?? s.name}” no site da ${doc.profile.name} e quero saber mais.`;
      slides.push({
        id: sl.id,
        image,
        tag: sl.tag,
        title: sl.title,
        text: sl.text,
        ...(sl.button && doc.contact.whatsapp
          ? { button: { label: sl.button, href: whatsappHref(doc.contact.whatsapp, msg) } }
          : {}),
      });
    }
    if (cover && slides.length) items.push({ id: s.id, name: s.name, cover, slides });
  }
  if (!items.length) return null;
  return (
    <StoriesBar
      blockId={block.id}
      title={block.title}
      items={items}
      brand={{ name: doc.profile.name, logo: catalogImage(ctx, doc.profile.logo, "") }}
    />
  );
}

function Promos({ ctx, block }: { ctx: Ctx; block: BlockOf<"promos"> }) {
  const w = ctx.doc.contact.whatsapp;
  const href = (title: string) =>
    w
      ? whatsappHref(
          w,
          `Oi! Vi a oferta “${title}” no site da ${ctx.doc.profile.name} e quero saber mais.`,
        )
      : undefined;
  // Faixas pequenas seguidas ficam lado a lado.
  const rows: (BlockOf<"promos">["items"][number] | BlockOf<"promos">["items"])[] = [];
  for (const p of block.items) {
    const last = rows.at(-1);
    if (p.size === "small" && Array.isArray(last)) last.push(p);
    else rows.push(p.size === "small" ? [p] : p);
  }
  const art = (p: BlockOf<"promos">["items"][number], sizes: string) =>
    p.image ? <Img ctx={ctx} image={p.image} sizes={sizes} alt="" className="shop-art" /> : null;
  return (
    <div className="shop-promos" data-block-id={block.id}>
      {rows.map((r) =>
        Array.isArray(r) ? (
          <ul key={r[0].id} className="shop-strips">
            {r.map((p) => {
              const link = href(p.title);
              const body = (
                <>
                  <strong>{p.title}</strong>
                  {p.text && <span>{p.text}</span>}
                  {art(p, "120px")}
                </>
              );
              return (
                <li key={p.id}>
                  {link ? (
                    <a
                      className="shop-strip"
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      data-track={`o:${block.id}:${p.id}`}
                    >
                      {body}
                    </a>
                  ) : (
                    <div className="shop-strip">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div key={r.id} className="shop-offer">
            <div className="shop-offer-txt">
              {r.tag && <span className="shop-tag">{r.tag}</span>}
              <h2>{r.title}</h2>
              {r.text && <p>{r.text}</p>}
              {href(r.title) && (
                <a
                  className="shop-btn"
                  href={href(r.title)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-track={`o:${block.id}:${r.id}`}
                >
                  {r.button ?? "Quero essa oferta"}
                </a>
              )}
            </div>
            {art(r, "240px")}
          </div>
        ),
      )}
    </div>
  );
}

function Catalog({ ctx, block }: { ctx: Ctx; block: BlockOf<"catalog"> }) {
  const { doc } = ctx;
  const w = doc.contact.whatsapp;
  if (!w) return null;
  const products: ShopProductView[] = [];
  const filters: string[] = [];
  const add = (f: string) => !filters.includes(f) && filters.push(f);
  if (block.categories.length > 1) block.categories.forEach((c) => add(c.name));
  for (const c of block.categories)
    for (const p of c.products) {
      const photos: ShopProductView["photos"] = [];
      const main = catalogImage(ctx, p.image, p.image.alt || p.name);
      if (main) photos.push({ image: main, label: p.image.title ?? "Foto 1" });
      for (const m of p.media ?? []) {
        if (m.kind !== "image") continue;
        const img = catalogImage(ctx, m, m.alt || p.name);
        if (img) photos.push({ image: img, label: m.title ?? `Foto ${photos.length + 1}` });
      }
      if (!photos.length) continue;
      p.tags?.forEach(add);
      const price = p.priceCents !== undefined ? ` (${money(p.priceCents)})` : "";
      products.push({
        catId: c.id,
        id: p.id,
        name: p.name,
        category: c.name,
        tags: p.tags ?? [],
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        photos,
        orderHref: whatsappHref(
          w,
          `Oi! Vim pelo site da ${doc.profile.name} e quero o modelo ${p.name}${price}.`,
        ),
      });
    }
  return (
    <ShopCatalog
      blockId={block.id}
      title={block.title}
      subtitle={block.subtitle}
      filters={filters}
      products={products}
    />
  );
}

const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Text({ ctx, block }: { ctx: Ctx; block: BlockOf<"text"> }) {
  const c = ctx.doc.contact;
  const id = `bloco-${block.id}`;
  const maps =
    c.mapsUrl ??
    (c.address &&
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`);
  return (
    <section
      className="shop-panel"
      aria-labelledby={block.title ? id : undefined}
      data-block-id={block.id}
    >
      {block.title && <h2 id={id}>{block.title}</h2>}
      {block.body.split(/\n{2,}/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {block.showAddress && c.address && maps && (
        <a className="shop-address" href={maps} target="_blank" rel="noopener noreferrer">
          <Icon name="maps" />
          {c.address}
        </a>
      )}
    </section>
  );
}

function Hours({ block }: { block: BlockOf<"hours"> }) {
  const id = `bloco-${block.id}`;
  return (
    <section className="shop-panel" aria-labelledby={id} data-block-id={block.id}>
      <h2 id={id}>{block.title}</h2>
      <dl className="shop-hours">
        {block.rows.map((r, i) => (
          <div key={i}>
            <dt>{r.days}</dt>
            <dd>{r.time}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Cartões (Instagram, Google…): claros; o marcado como destaque fica na cor escura. */
function Links({ ctx, blocks }: { ctx: Ctx; blocks: BlockOf<"link">[] }) {
  const cards = blocks.flatMap((b) => {
    const r = resolveLink(b, ctx.doc.contact);
    return r ? [{ b, r }] : [];
  });
  if (!cards.length) return null;
  return (
    <ul className="shop-links">
      {cards.map(({ b, r }) => (
        <li key={b.id}>
          <a
            className={b.featured ? "shop-link featured" : "shop-link"}
            href={r.href}
            data-track={`b:${b.id}`}
            data-block-id={b.id}
            {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {!b.hideIcon && (
              <span
                className="shop-ico"
                data-ico={r.icon}
                style={{ "--ico": b.iconColor ?? ICONS[r.icon].color } as CSSProperties}
              >
                <Icon name={r.icon} />
              </span>
            )}
            <span className="shop-link-txt">
              <strong>{b.title}</strong>
              {cardSubtitle(b.subtitle, r.subtitle) && (
                <small>{cardSubtitle(b.subtitle, r.subtitle)}</small>
              )}
              {r.icon === "google" && b.featured && (
                <span className="shop-stars" aria-hidden="true">
                  ★★★★★
                </span>
              )}
            </span>
            <Icon name="chevron" className="shop-go" />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ShopPage({
  ctx,
  className,
  style,
  embedded,
  trackSlug,
}: {
  ctx: Ctx;
  className: string;
  style: CSSProperties;
  embedded: boolean;
  trackSlug?: string;
}) {
  const { doc } = ctx;
  const c = doc.contact;
  const wa = whatsappTarget(c, c.whatsappMessage);
  const blocks = doc.blocks.filter((b) => !b.hidden);
  const out: ReactNode[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "link") {
      const run: BlockOf<"link">[] = [];
      while (i < blocks.length && blocks[i].type === "link")
        run.push(blocks[i++] as BlockOf<"link">);
      i--;
      out.push(<Links key={b.id} ctx={ctx} blocks={run} />);
    } else if (b.type === "stories") out.push(<Stories key={b.id} ctx={ctx} block={b} />);
    else if (b.type === "promos") out.push(<Promos key={b.id} ctx={ctx} block={b} />);
    else if (b.type === "catalog") out.push(<Catalog key={b.id} ctx={ctx} block={b} />);
    else if (b.type === "text") out.push(<Text key={b.id} ctx={ctx} block={b} />);
    else if (b.type === "hours") out.push(<Hours key={b.id} block={b} />);
  }

  return (
    <div className={`shop ${className}${embedded ? " shop--embedded" : ""}`} style={style}>
      <main className="shop-main">
        <header className="shop-top" data-edit="profile">
          {doc.profile.logo && (
            <Img
              ctx={ctx}
              image={doc.profile.logo}
              sizes="64px"
              priority
              className="shop-logo"
              alt=""
            />
          )}
          <div>
            <h1>{doc.profile.name}</h1>
            {doc.profile.tagline && <p>{doc.profile.tagline}</p>}
          </div>
          {wa && (
            <a
              className="shop-wa"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Conversar no WhatsApp"
              data-track="s:whatsapp"
              data-edit="contact"
            >
              <Icon name="whatsapp" />
            </a>
          )}
        </header>
        {out}
        <footer className="shop-foot">
          {doc.profile.name}
          {doc.profile.city ? ` · ${doc.profile.city}` : ""}
        </footer>
      </main>
      {doc.floatingWhatsapp && wa && (
        <a
          className="shop-fab"
          data-track="fab"
          style={doc.floatingWhatsappColor ? { background: doc.floatingWhatsappColor } : undefined}
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Conversar no WhatsApp"
        >
          <Icon name="whatsapp" />
        </a>
      )}
      {trackSlug && <Tracker slug={trackSlug} />}
    </div>
  );
}
