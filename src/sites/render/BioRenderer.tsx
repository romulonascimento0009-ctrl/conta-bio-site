import QRCode from "qrcode";
import type { CSSProperties } from "react";
import type { AssetInfo } from "@/data/assets";
import {
  HERO_DEFAULTS,
  resolveLink,
  veilAlphas,
  wifiQrPayload,
  type BioDocument,
  type Block,
  type BlockOf,
  type ImageRef,
} from "@/sites/bio";
import { ICONS, type IconId } from "@/sites/icons";
import { whatsappHref } from "@/sites/links";
import { rgbaCss } from "@/sites/color";
import { PATTERNS } from "@/sites/patterns";
import "./bio.css";
import { CopyButton, ShareButton, Tracker } from "./client-buttons";
import { loadedFont } from "./fonts";
import { Icon } from "./Icon";
import { mediaUrl } from "./media";

const RADIUS = {
  square: { card: "12px", ico: "8px", panel: "12px" },
  soft: { card: "18px", ico: "12px", panel: "18px" },
  pill: { card: "999px", ico: "50%", panel: "26px" },
} as const;

type Ctx = { doc: BioDocument; assets: Map<string, AssetInfo> };

function Img({
  ctx,
  image,
  sizes,
  className,
  priority,
  alt,
}: {
  ctx: Ctx;
  image: ImageRef | undefined;
  sizes: string;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const info = image && ctx.assets.get(image.assetId);
  if (!image || !info) return null;
  const fallback = info.variants.find((w) => w >= 480) ?? info.variants.at(-1)!;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes próprias, sem next/image
    <img
      src={mediaUrl(info.id, fallback)}
      srcSet={info.variants.map((w) => `${mediaUrl(info.id, w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={info.width}
      height={info.height}
      alt={alt ?? image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

function LinkCard({ ctx, block }: { ctx: Ctx; block: BlockOf<"link"> }) {
  const resolved = resolveLink(block, ctx.doc.contact);
  if (!resolved) return null;
  const subtitle = block.subtitle || resolved.subtitle;
  return (
    <li>
      <a
        className={`bio-card${block.variant === "light" ? " light" : ""}`}
        style={
          block.colors && block.variant === "solid"
            ? ({
                "--card-top": block.colors.top,
                "--card-bottom": block.colors.bottom,
              } as CSSProperties)
            : undefined
        }
        href={resolved.href}
        data-track={`b:${block.id}`}
        {...(resolved.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        data-block-id={block.id}
      >
        <span className={`bio-ico ${ICONS[resolved.icon].tile}`}>
          <Icon name={resolved.icon} />
        </span>
        <span className="bio-txt">
          {block.badge && <span className="bio-badge">{block.badge}</span>}
          <strong>{block.title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        <Icon name="chevron" className="bio-go" />
      </a>
    </li>
  );
}

function QrCode({ text }: { text: string }) {
  // Desenha o QR no servidor a partir da matriz de módulos (sem HTML externo).
  const qr = QRCode.create(text, { errorCorrectionLevel: "M" });
  const size = qr.modules.size;
  let d = "";
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) if (qr.modules.get(x, y)) d += `M${x + 2} ${y + 2}h1v1h-1z`;
  }
  return (
    <svg
      className="bio-qr-code"
      viewBox={`0 0 ${size + 4} ${size + 4}`}
      role="img"
      aria-label="QR code para conectar ao Wi-Fi"
      shapeRendering="crispEdges"
    >
      <rect width="100%" height="100%" fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

function Panel({ block, ctx }: { block: Exclude<Block, BlockOf<"link">>; ctx: Ctx }) {
  const titleId = `bloco-${block.id}`;
  switch (block.type) {
    case "wifi":
      return (
        <section className="bio-panel bio-wifi" aria-labelledby={titleId} data-block-id={block.id}>
          <h2 id={titleId}>
            <span className="bio-hico c-wifi">
              <Icon name="wifi" />
            </span>
            {block.title}
          </h2>
          <dl>
            <dt>Rede</dt>
            <dd>{block.network}</dd>
            {block.security !== "nopass" && block.password && (
              <>
                <dt>Senha</dt>
                <dd>{block.password}</dd>
              </>
            )}
          </dl>
          {block.security !== "nopass" && block.password && (
            <CopyButton value={block.password} label="Copiar senha" done="Senha copiada" />
          )}
          {block.showQr && (
            <details className="bio-qr">
              <summary>
                <Icon name="qr" /> Conectar com QR code
              </summary>
              <QrCode text={wifiQrPayload(block)} />
              <p>Aponte a câmera do celular para conectar.</p>
            </details>
          )}
        </section>
      );
    case "hours":
      return (
        <section className="bio-panel" aria-labelledby={titleId} data-block-id={block.id}>
          <h2 id={titleId}>
            <span className="bio-hico c-clock">
              <Icon name="clock" />
            </span>
            {block.title}
          </h2>
          <dl className="bio-hours">
            {block.rows.map((r, i) => (
              <div key={i}>
                <dt>{r.days}</dt>
                <dd>{r.time}</dd>
              </div>
            ))}
          </dl>
        </section>
      );
    case "gallery": {
      const images = block.images.filter((img) => ctx.assets.has(img.assetId));
      if (!images.length) return null;
      return (
        <section className="bio-panel" aria-labelledby={titleId} data-block-id={block.id}>
          <h2 id={titleId}>
            <span className="bio-hico c-photos">
              <Icon name="photos" />
            </span>
            {block.title}
          </h2>
          <ul className="bio-gallery" data-count={Math.min(images.length, 5)}>
            {images.map((img, i) => (
              <li key={`${img.assetId}-${i}`}>
                <Img ctx={ctx} image={img} sizes={i === 0 ? "300px" : "150px"} />
              </li>
            ))}
          </ul>
        </section>
      );
    }
    case "text":
      return (
        <section
          className="bio-panel bio-text"
          aria-labelledby={block.title ? titleId : undefined}
          data-block-id={block.id}
        >
          {block.title && <h2 id={titleId}>{block.title}</h2>}
          {block.body.split(/\n{2,}/).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </section>
      );
  }
}

/** Agrupa cartões consecutivos numa lista e intercala os painéis, mantendo a ordem do documento. */
function Blocks({ ctx }: { ctx: Ctx }) {
  const groups: (BlockOf<"link">[] | Exclude<Block, BlockOf<"link">>)[] = [];
  for (const b of ctx.doc.blocks) {
    if (b.hidden) continue;
    if (b.type === "link") {
      const last = groups.at(-1);
      if (Array.isArray(last)) last.push(b);
      else groups.push([b]);
    } else {
      groups.push(b);
    }
  }
  return groups.map((g, i) =>
    Array.isArray(g) ? (
      <ul key={`links-${i}`} className="bio-links" style={i > 0 ? { paddingTop: 14 } : undefined}>
        {g.map((b) => (
          <LinkCard key={b.id} ctx={ctx} block={b} />
        ))}
      </ul>
    ) : (
      <Panel key={g.id} ctx={ctx} block={g} />
    ),
  );
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => w.length > 2 || /^[A-ZÀ-Ú]/.test(w));
  return (
    words
      .slice(0, 2)
      .map((w) => w[0])
      .join("") || name.slice(0, 2)
  ).toUpperCase();
}

/**
 * Bio Site completo a partir de um documento validado.
 * `embedded`: dentro do editor (prévia de celular), sem elementos presos à janela do navegador.
 */
export function BioRenderer({
  doc,
  assets,
  embedded = false,
  trackSlug,
}: {
  doc: BioDocument;
  assets: Map<string, AssetInfo>;
  embedded?: boolean;
  /** Só no endereço público: registra visitas e cliques (métricas). */
  trackSlug?: string;
}) {
  const ctx: Ctx = { doc, assets };
  const { colors, fonts, radius, pattern } = doc.theme;
  const ticker = doc.ticker.colors ?? doc.tickerTheme;
  const hero = doc.theme.hero ?? HERO_DEFAULTS;
  const [veilTop, veilBottom] = veilAlphas(hero);
  const display = loadedFont(fonts.display);
  const body = loadedFont(fonts.body);
  const c = doc.contact;

  const style = {
    "--base": colors.base,
    "--card-top": colors.cardTop,
    "--card-bottom": colors.cardBottom,
    "--accent": colors.accent,
    "--ink": colors.ink,
    "--ink-muted": colors.inkMuted,
    "--logo-bg": colors.logoBg,
    "--logo-fg": colors.logoFg,
    "--glow1": colors.glow1,
    "--glow2": colors.glow2,
    "--glow3": colors.glow3,
    "--ticker-bg": ticker.bg,
    "--ticker-fg": ticker.fg,
    "--pattern": PATTERNS[pattern].css,
    "--hero-text": hero.text,
    "--veil-top": rgbaCss(hero.veil, veilTop),
    "--veil-bottom": rgbaCss(hero.veil, veilBottom),
    "--blur": `${hero.blur}px`,
    "--logo-border": hero.logoBorder,
    "--radius": RADIUS[radius].card,
    "--radius-ico": RADIUS[radius].ico,
    "--radius-panel": RADIUS[radius].panel,
    "--font-display": display.family,
    "--font-body": body.family,
  } as CSSProperties;

  const social: { icon: IconId; href: string; label: string }[] = [];
  if (c.instagram)
    social.push({
      icon: "instagram",
      href: `https://instagram.com/${c.instagram}`,
      label: "Instagram",
    });
  if (c.googleReviewUrl)
    social.push({ icon: "google", href: c.googleReviewUrl, label: "Avaliar no Google" });
  if (c.facebookUrl) social.push({ icon: "facebook", href: c.facebookUrl, label: "Facebook" });
  if (c.tiktok)
    social.push({ icon: "tiktok", href: `https://www.tiktok.com/@${c.tiktok}`, label: "TikTok" });
  if (c.youtubeUrl) social.push({ icon: "youtube", href: c.youtubeUrl, label: "YouTube" });
  if (c.phone) social.push({ icon: "phone", href: `tel:${c.phone}`, label: "Telefone" });
  if (c.email) social.push({ icon: "email", href: `mailto:${c.email}`, label: "E-mail" });

  const tickerOn = doc.ticker.enabled && doc.ticker.items.length > 0;

  return (
    <div
      className={`bio ${display.variable} ${body.variable}${embedded ? " bio--embedded" : ""}`}
      style={style}
    >
      <div className="bio-photo" aria-hidden="true">
        <Img ctx={ctx} image={doc.profile.background} sizes="480px" alt="" />
      </div>
      <div className="bio-veil" aria-hidden="true" />

      <main className="bio-main">
        <header className="bio-hero" data-edit="profile">
          <div className="bio-logo" aria-hidden={doc.profile.logo ? undefined : "true"}>
            {doc.profile.logo && assets.has(doc.profile.logo.assetId) ? (
              <Img ctx={ctx} image={doc.profile.logo} sizes="108px" priority />
            ) : (
              initials(doc.profile.name)
            )}
          </div>
          <h1 className="bio-name">{doc.profile.name}</h1>
          {doc.profile.tagline && <p className="bio-tagline">{doc.profile.tagline}</p>}
          {doc.profile.categories.length > 0 && (
            <ul className="bio-chips" aria-label="Categorias">
              {doc.profile.categories.map((cat) => (
                <li key={cat}>{cat}</li>
              ))}
            </ul>
          )}
          {(doc.profile.city || doc.profile.showShare) && (
            <div className="bio-meta">
              {doc.profile.city && (
                <span className="bio-tag">
                  <Icon name="pin-outline" /> {doc.profile.city}
                </span>
              )}
              {doc.profile.showShare && <ShareButton title={doc.meta.title} />}
            </div>
          )}
        </header>

        {tickerOn && (
          <section aria-label="Avisos" data-edit="ticker">
            <ul className="bio-sr">
              {doc.ticker.items.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
            <div className="bio-ticker" aria-hidden="true">
              <div className="bio-ticker-track">
                {[0, 1, 2, 3].flatMap((rep) =>
                  doc.ticker.items.map((t, i) => <span key={`${rep}-${i}`}>{t}</span>),
                )}
              </div>
            </div>
          </section>
        )}

        <Blocks ctx={ctx} />

        {social.length > 0 && (
          <ul className="bio-social" aria-label="Redes e contatos" data-edit="contact">
            {social.map((s) => (
              <li key={s.icon}>
                <a
                  href={s.href}
                  data-track={`s:${s.icon}`}
                  className={ICONS[s.icon].tile}
                  aria-label={s.label}
                  {...(s.href.startsWith("http")
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                >
                  <Icon name={s.icon} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>

      {doc.floatingWhatsapp && c.whatsapp && (
        <a
          className="bio-fab"
          data-track="fab"
          style={doc.floatingWhatsappColor ? { background: doc.floatingWhatsappColor } : undefined}
          href={whatsappHref(c.whatsapp, c.whatsappMessage)}
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
