import QRCode from "qrcode";
import type { CSSProperties, ReactNode } from "react";
import type { AssetInfo } from "@/data/assets";
import {
  glassTop,
  HERO_DEFAULTS,
  isStandardStyle,
  neonGlass,
  resolveLink,
  satinCard,
  splitNameAccent,
  standardCardBase,
  veilAlphas,
  wifiQrPayload,
  type BioDocument,
  type Block,
  type BlockOf,
  type ImageRef,
} from "@/sites/bio";
import {
  featureColors,
  glossVars,
  ICONS,
  SECTION_ICONS,
  type IconId,
  type SectionIconId,
} from "@/sites/icons";
import { isItalicFont } from "@/sites/fonts";
import { cardSubtitle, whatsappHref } from "@/sites/links";
import { mixHex, rgbaCss } from "@/sites/color";
import { PATTERNS } from "@/sites/patterns";
import { pixPayload } from "@/sites/pix";
import "./bio.css";
import { CopyButton, SheetCard, ShareButton, Tracker } from "./client-buttons";
import { ElectricFx } from "./ElectricFx";
import { Catalog, type CatalogImage, type CatalogView } from "./Catalog";
import { GlitterFx } from "./GlitterFx";
import { loadedFont } from "./fonts";
import { Icon } from "./Icon";
import { mediaUrl } from "./media";

const RADIUS = {
  square: { card: "12px", ico: "8px", panel: "12px" },
  soft: { card: "18px", ico: "12px", panel: "18px" },
  pill: { card: "999px", ico: "50%", panel: "26px" },
} as const;

/** `cartKey`: separa o pedido guardado no navegador por Bio Site (e a prévia do publicado). */
type Ctx = {
  doc: BioDocument;
  assets: Map<string, AssetInfo>;
  cartKey: string;
  /** Página "Fotos do pedido" do catálogo (só no endereço público). */
  orderBase?: string;
};

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

/**
 * Fundo do ícone com brilho. Sem cor própria, ícones de marca usam o visual da marca (`tile`);
 * com cor própria, o desenho fica branco (`mono`, inclusive o "G" colorido do Google).
 */
function tileProps(icon: IconId | SectionIconId, base: string, custom?: string) {
  const def: { color: string; tile?: string } =
    icon in SECTION_ICONS ? SECTION_ICONS[icon as SectionIconId] : ICONS[icon as IconId];
  const cls = custom ? `${base} mono` : def.tile ? `${base} ${def.tile}` : base;
  return { className: cls, style: glossVars(custom ?? def.color) as CSSProperties };
}

function SectionIcon({ icon, color }: { icon: SectionIconId; color?: string }) {
  return (
    <span {...tileProps(icon, "bio-hico", color)}>
      <Icon name={icon} />
    </span>
  );
}

/**
 * Cartão do visual padrão (D41): todos iguais, sem destaque nem valor à direita. O estilo
 * (vidro neon, cor do ícone, escuro) vem da classe no .bio; a cor do ícone tinge o cartão.
 * Sem ícone (`hideIcon`), mostra só o nome, centralizado.
 */
function stdCard(iconColor: string, hideIcon?: boolean) {
  return {
    className: `bio-card std${hideIcon ? " plain" : ""}`,
    style: { "--c": iconColor, "--tint": glassTop(iconColor) } as CSSProperties,
  };
}

function StdCardBody({
  icon,
  iconColor,
  hideIcon,
  tag,
  badge,
  title,
  subtitle,
  photo,
}: {
  icon: IconId | SectionIconId;
  /** Foto no lugar do ícone (galeria com "Usar a primeira foto como ícone"). */
  photo?: ReactNode;
  iconColor?: string;
  hideIcon?: boolean;
  tag?: string;
  badge?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      {tag && <span className="bio-corner">{tag}</span>}
      {!hideIcon &&
        (photo ? (
          <span className="bio-ico photo">{photo}</span>
        ) : (
          <span {...tileProps(icon, "bio-ico", iconColor)}>
            <Icon name={icon} />
          </span>
        ))}
      <span className="bio-txt">
        {badge && <span className="bio-badge">{badge}</span>}
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </span>
      {!hideIcon && <Icon name="chevron" className="bio-go" />}
    </>
  );
}

function LinkCard({ ctx, block }: { ctx: Ctx; block: BlockOf<"link"> }) {
  const resolved = resolveLink(block, ctx.doc.contact);
  if (!resolved) return null;
  if (isStandardStyle(ctx.doc.theme.cardStyle)) {
    return (
      <li>
        <a
          {...stdCard(block.iconColor ?? ICONS[resolved.icon].color, block.hideIcon)}
          href={resolved.href}
          data-track={`b:${block.id}`}
          {...(resolved.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          data-block-id={block.id}
        >
          <StdCardBody
            icon={resolved.icon}
            iconColor={block.iconColor}
            hideIcon={block.hideIcon}
            tag={block.tag}
            badge={block.badge}
            title={block.title}
            subtitle={cardSubtitle(block.subtitle, resolved.subtitle)}
          />
        </a>
      </li>
    );
  }
  const subtitle = cardSubtitle(block.subtitle, resolved.subtitle);
  // Cor própria do cartão ou destaque mantêm o degradê em qualquer estilo; os demais seguem o
  // estilo escolhido na Aparência (cor do tema, claros, vidro).
  const own = block.variant === "solid" ? block.colors : undefined;
  const iconColor = block.iconColor ?? ICONS[resolved.icon].color;
  const neon = block.featured && block.featureStyle === "neon";
  const feature = block.featured
    ? own && !neon
      ? { ...own, glow: own.top }
      : featureColors(iconColor)
    : undefined;
  // Neon: vidro escuro com contorno e luz na cor viva do ícone (sem degradê de fundo).
  const colors = neon ? undefined : (feature ?? own);
  const style = ctx.doc.theme.cardStyle ?? "theme";
  // No estilo futurista todo cartão vira pílula de vidro (inclusive os marcados como "Claro",
  // para a página ficar uniforme); cartões com cor própria ou em destaque mantêm a cor.
  const look = neon
    ? " glass neon"
    : style === "glass"
      ? colors
        ? " glass own"
        : " glass"
      : block.variant === "light"
        ? " light"
        : colors
          ? ""
          : style === "light"
            ? " light"
            : "";
  // Vidro do futurista: na cor do ícone (padrão), numa cor só ou preto transparente.
  const tint =
    look === " glass" && ctx.doc.theme.cardTint !== "black"
      ? ctx.doc.theme.cardTint === "custom" && ctx.doc.theme.cardTintColor
        ? ctx.doc.theme.cardTintColor
        : iconColor
      : undefined;
  const cardStyle = colors
    ? { "--card-top": colors.top, "--card-bottom": colors.bottom }
    : tint
      ? {
          "--glass-top": rgbaCss(glassTop(tint), 0.84),
          "--glass-bottom": rgbaCss(mixHex("#12141c", tint, 0.2), 0.9),
          "--glass-edge": rgbaCss(tint, 0.5),
          "--glass-glow": rgbaCss(tint, 0.45),
        }
      : undefined;
  return (
    <li
      className={feature ? "bio-featured" : undefined}
      style={feature ? ({ "--halo": feature.glow } as CSSProperties) : undefined}
    >
      <a
        className={`bio-card${look}${feature ? " featured" : ""}`}
        style={cardStyle as CSSProperties | undefined}
        href={resolved.href}
        data-track={`b:${block.id}`}
        {...(resolved.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        data-block-id={block.id}
      >
        {block.tag && <span className="bio-corner">{block.tag}</span>}
        <span {...tileProps(resolved.icon, "bio-ico", block.iconColor)}>
          <Icon name={resolved.icon} />
        </span>
        <span className="bio-txt">
          {block.badge && <span className="bio-badge">{block.badge}</span>}
          <strong>{block.title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </span>
        {block.value ? (
          <span className="bio-value">{block.value}</span>
        ) : (
          <Icon name="chevron" className="bio-go" />
        )}
      </a>
    </li>
  );
}

/** Galeria em cartão ("Meus trabalhos", "Feedback de clientes"): abre as fotos com legenda. */
function GalleryCard({ ctx, block }: { ctx: Ctx; block: BlockOf<"gallery"> }) {
  const images = block.images.filter((img) => ctx.assets.has(img.assetId));
  if (!images.length) return null;
  return (
    <li>
      <SheetCard
        {...stdCard(
          block.iconColor ?? (block.icon ? ICONS[block.icon] : SECTION_ICONS.photos).color,
          block.hideIcon,
        )}
        track={`b:${block.id}`}
        blockId={block.id}
        title={block.title}
        trigger={
          <StdCardBody
            icon={block.icon ?? "photos"}
            photo={
              block.iconPhoto ? <Img ctx={ctx} image={images[0]} sizes="54px" alt="" /> : undefined
            }
            iconColor={block.iconColor}
            hideIcon={block.hideIcon}
            title={block.title}
            subtitle={cardSubtitle(block.subtitle)}
          />
        }
      >
        {images.map((img, i) => (
          <figure key={`${img.assetId}-${i}`} className="bio-shot">
            <Img
              ctx={ctx}
              image={img}
              sizes="(max-width: 480px) 100vw, 440px"
              alt={img.alt || img.title || ""}
            />
            {(img.title || img.caption) && (
              <figcaption>
                {img.title && <strong>{img.title}</strong>}
                {img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </SheetCard>
    </li>
  );
}

/** Dados do Pix: recebedor, chave, botões de copiar e QR "copia e cola" (sem valor). */
function PixInfo({ block }: { block: BlockOf<"pix"> }) {
  const payload = pixPayload(block);
  return (
    <div className="bio-pix">
      <dl>
        <dt>Recebedor</dt>
        <dd>{block.name}</dd>
        <dt>Chave Pix</dt>
        <dd>{block.key}</dd>
        {block.bank && (
          <>
            <dt>Banco</dt>
            <dd>{block.bank}</dd>
          </>
        )}
      </dl>
      <CopyButton value={block.key} label="Copiar chave Pix" done="Chave copiada" icon="copy" />
      {block.showQr && (
        <>
          <QrCode text={payload} label="QR code para pagar com Pix" />
          <p>Abra o app do banco, escolha Pix e leia o QR code ou use o Pix copia e cola.</p>
          <CopyButton
            value={payload}
            label="Copiar Pix copia e cola"
            done="Código copiado"
            icon="copy"
            subtle
          />
        </>
      )}
    </div>
  );
}

/** Dados do Wi-Fi: rede, senha e botão de copiar (QR só se ligado em documentos antigos). */
function WifiInfo({ block }: { block: BlockOf<"wifi"> }) {
  const locked = block.security !== "nopass" && !!block.password;
  return (
    <div className="bio-pix">
      <dl>
        <dt>Rede</dt>
        <dd>{block.network}</dd>
        {locked && (
          <>
            <dt>Senha</dt>
            <dd>{block.password}</dd>
          </>
        )}
      </dl>
      {locked ? (
        <CopyButton value={block.password} label="Copiar senha" done="Senha copiada" />
      ) : (
        <p>Rede aberta, sem senha.</p>
      )}
      {block.showQr && (
        <details className="bio-qr">
          <summary>
            <Icon name="qr" /> Conectar com QR code
          </summary>
          <QrCode text={wifiQrPayload(block)} label="QR code para conectar ao Wi-Fi" />
          <p>Aponte a câmera do celular para conectar.</p>
        </details>
      )}
    </div>
  );
}

/** Wi-Fi no visual padrão: o cartão mostra só a rede; a senha aparece ao tocar. */
function WifiCard({ block }: { block: BlockOf<"wifi"> }) {
  return (
    <li>
      <SheetCard
        {...stdCard(block.iconColor ?? SECTION_ICONS.wifi.color)}
        track={`b:${block.id}`}
        blockId={block.id}
        title={block.title}
        trigger={
          <StdCardBody
            icon="wifi"
            iconColor={block.iconColor}
            title={block.title}
            subtitle={`Rede: ${block.network}`}
          />
        }
      >
        <WifiInfo block={block} />
      </SheetCard>
    </li>
  );
}

/** Pix no visual padrão: cartão que abre os dados de pagamento por cima da página. */
function PixCard({ block }: { block: BlockOf<"pix"> }) {
  return (
    <li>
      <SheetCard
        {...stdCard(block.iconColor ?? ICONS.pix.color)}
        track={`b:${block.id}`}
        blockId={block.id}
        title={block.title}
        trigger={
          <StdCardBody
            icon="pix"
            iconColor={block.iconColor}
            title={block.title}
            subtitle="Toque para ver a chave"
          />
        }
      >
        <PixInfo block={block} />
      </SheetCard>
    </li>
  );
}

function QrCode({ text, label }: { text: string; label: string }) {
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
      aria-label={label}
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
            <SectionIcon icon="wifi" color={block.iconColor} />
            {block.title}
          </h2>
          <WifiInfo block={block} />
        </section>
      );
    case "pix":
      return (
        <section className="bio-panel bio-wifi" aria-labelledby={titleId} data-block-id={block.id}>
          <h2 id={titleId}>
            <span {...tileProps("pix", "bio-hico", block.iconColor)}>
              <Icon name="pix" />
            </span>
            {block.title}
          </h2>
          <PixInfo block={block} />
        </section>
      );
    case "hours":
      return (
        <section className="bio-panel" aria-labelledby={titleId} data-block-id={block.id}>
          <h2 id={titleId}>
            <SectionIcon icon="clock" color={block.iconColor} />
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
            <SectionIcon icon="photos" color={block.iconColor} />
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
    case "catalog":
      return <CatalogBlock ctx={ctx} block={block} />;
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

/** Variantes de uma imagem do cliente para o catálogo (componente do navegador). */
function catalogImage(ctx: Ctx, image: ImageRef | undefined, alt: string): CatalogImage | null {
  const info = image && ctx.assets.get(image.assetId);
  if (!image || !info) return null;
  const fallback = info.variants.find((w) => w >= 480) ?? info.variants.at(-1)!;
  return {
    src: mediaUrl(info.id, fallback),
    srcSet: info.variants.map((w) => `${mediaUrl(info.id, w)} ${w}w`).join(", "),
    width: info.width,
    height: info.height,
    alt,
  };
}

/** Catálogo com carrinho: os dados vão prontos para o componente do navegador. */
function CatalogBlock({ ctx, block }: { ctx: Ctx; block: BlockOf<"catalog"> }) {
  const { doc } = ctx;
  if (!doc.contact.whatsapp) return null;
  const categories: CatalogView[] = block.categories.map((c) => ({
    id: c.id,
    name: c.name,
    tag: c.tag,
    cover: catalogImage(ctx, c.cover ?? c.products[0].image, ""),
    products: c.products.map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      image: catalogImage(ctx, p.image, p.image.alt || p.name),
    })),
  }));
  return (
    <Catalog
      blockId={block.id}
      title={block.title}
      subtitle={block.subtitle}
      categories={categories}
      whatsapp={doc.contact.whatsapp}
      intro={`Oi! Vim pelo Bio Site da ${doc.profile.name} e quero fazer este pedido:`}
      storageKey={`bio-pedido:${ctx.cartKey}`}
      orderBase={ctx.orderBase}
    />
  );
}

/** Agrupa cartões consecutivos numa lista e intercala os painéis, mantendo a ordem do documento. */
function Blocks({ ctx }: { ctx: Ctx }) {
  type CardBlock = BlockOf<"link"> | BlockOf<"gallery"> | BlockOf<"pix"> | BlockOf<"wifi">;
  const groups: (CardBlock[] | Exclude<Block, BlockOf<"link">>)[] = [];
  // Galeria em cartão só no visual padrão; nos estilos antigos continua como painel.
  const std = isStandardStyle(ctx.doc.theme.cardStyle);
  for (const b of ctx.doc.blocks) {
    if (b.hidden) continue;
    if (
      b.type === "link" ||
      (std && b.type === "gallery" && b.display === "card") ||
      (std && (b.type === "pix" || b.type === "wifi"))
    ) {
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
        {g.map((b) =>
          b.type === "link" ? (
            <LinkCard key={b.id} ctx={ctx} block={b} />
          ) : b.type === "pix" ? (
            <PixCard key={b.id} block={b} />
          ) : b.type === "wifi" ? (
            <WifiCard key={b.id} block={b} />
          ) : (
            <GalleryCard key={b.id} ctx={ctx} block={b} />
          ),
        )}
      </ul>
    ) : (
      <Panel key={g.id} ctx={ctx} block={g} />
    ),
  );
}

/**
 * Fundo em movimento do futurista: manchas de luz nas cores do topo (Cor 1, 2 e 3) que se
 * deslocam devagar. Só deslocamento e transparência (leve no celular).
 */
function Aurora() {
  return (
    <div className="bio-aurora" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
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
  publicUrl,
}: {
  doc: BioDocument;
  assets: Map<string, AssetInfo>;
  embedded?: boolean;
  /** Só no endereço público: registra visitas e cliques (métricas). */
  trackSlug?: string;
  /** Endereço público do sistema (PUBLIC_URL), para o link "Fotos do pedido" do catálogo. */
  publicUrl?: string;
}) {
  const ctx: Ctx = {
    doc,
    assets,
    cartKey: trackSlug ?? `previa:${doc.profile.name}`,
    orderBase: trackSlug && publicUrl ? `${publicUrl}/${trackSlug}/pedido` : undefined,
  };
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
    "--std-card": standardCardBase(colors.ink),
    "--display-style": isItalicFont(fonts.display) ? "italic" : "normal",
  } as Record<string, string>;
  const th = doc.theme;
  if (th.neonEdges) {
    const [glassA, glassB] = neonGlass(colors.base, th.neonEdges.start);
    Object.assign(style, {
      "--neon-a": th.neonEdges.start,
      "--neon-b": th.neonEdges.end,
      "--neon-glass-a": rgbaCss(glassA, 0.9),
      "--neon-glass-b": rgbaCss(glassB, 0.9),
      "--neon-inset": rgbaCss(th.neonEdges.start, 0.2),
    });
  }
  if (th.cardStyle === "satin") style["--satin"] = satinCard(colors.base);
  if (th.cardStyle === "deep") style["--card-text"] = th.cardText ?? "#ffffff";
  if (th.chips) Object.assign(style, { "--chip-bg": th.chips.bg, "--chip-fg": th.chips.fg });
  if (th.nameAccent) style["--name-accent"] = th.nameAccent;

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
  // Mesmo número do WhatsApp: o ícone abre o WhatsApp com a mensagem pronta (o número não aparece).
  if (c.phone && c.phone === c.whatsapp)
    social.push({
      icon: "whatsapp",
      href: whatsappHref(c.whatsapp, c.whatsappMessage),
      label: "WhatsApp",
    });
  else if (c.phone) social.push({ icon: "phone", href: `tel:${c.phone}`, label: "Telefone" });
  if (c.email) social.push({ icon: "email", href: `mailto:${c.email}`, label: "E-mail" });

  const tickerOn = doc.ticker.enabled && doc.ticker.items.length > 0;
  const motion = doc.theme.cardStyle === "glass" && doc.theme.motion !== false;
  const std = isStandardStyle(doc.theme.cardStyle);
  const logoFree = std && doc.profile.logoFrame === "none" && !!doc.profile.logo;
  const electric = std && th.effects === "electric";
  const glitter = std && th.effects === "glitter";
  // Fundo claro: topo com texto na cor dos painéis (cetim sempre; os demais quando marcado).
  const lightPage = std && (th.cardStyle === "satin" || !!th.lightPage);
  // Logo que já traz o nome e o slogan: os textos saem da tela (ficam para leitores e buscas).
  const logoName = !!doc.profile.logoHasName && !!doc.profile.logo;
  // Destaque do nome: última palavra na cor escolhida ("Rota 316").
  const nameParts = std && th.nameAccent ? splitNameAccent(doc.profile.name) : null;
  // Fundo do ramo (visual padrão): imagem nítida, parada enquanto a página rola.
  const page =
    std && doc.profile.pageBackground && assets.has(doc.profile.pageBackground.assetId)
      ? doc.profile.pageBackground
      : undefined;
  // Foto da fachada: nítida no alto (com onda); o fundo da página fica só com as cores do tema.
  const cover =
    doc.profile.backgroundMode === "cover" &&
    doc.profile.background &&
    assets.has(doc.profile.background.assetId)
      ? doc.profile.background
      : undefined;

  return (
    <div
      className={`bio ${display.variable} ${body.variable}${embedded ? " bio--embedded" : ""}${cover ? " bio--cover" : ""}${doc.theme.cardStyle === "glass" ? " bio--glass" : ""}${std ? ` bio--std bio--${doc.theme.cardStyle}` : ""}${page ? " bio--page" : ""}${logoFree ? " bio--logo-free" : ""}${std && th.taglineDark ? " bio--tagline-dark" : ""}${electric ? " bio--fx-electric" : ""}${glitter ? " bio--fx-glitter" : ""}${lightPage ? " bio--light-page" : ""}${logoName ? " bio--logo-name" : ""}`}
      style={style as CSSProperties}
    >
      <div className="bio-photo" aria-hidden="true">
        {page ? (
          <Img ctx={ctx} image={page} sizes="(max-width: 480px) 100vw, 1080px" alt="" />
        ) : (
          !cover && <Img ctx={ctx} image={doc.profile.background} sizes="480px" alt="" />
        )}
      </div>
      <div className="bio-veil" aria-hidden="true" />
      {motion && <Aurora />}
      {std && th.shine && <div className="bio-shine" aria-hidden="true" />}
      {electric && <ElectricFx />}
      {glitter && (
        <GlitterFx
          colors={th.neonEdges ? [th.neonEdges.start, th.neonEdges.end] : [colors.accent]}
          outline={colors.ink}
        />
      )}

      <main className="bio-main">
        {cover && (
          <div className="bio-cover">
            <Img ctx={ctx} image={cover} sizes="480px" priority />
          </div>
        )}
        <header className="bio-hero" data-edit="profile">
          <div className="bio-logo" aria-hidden={doc.profile.logo ? undefined : "true"}>
            {((electric && logoFree) || (glitter && !logoFree)) && (
              <span className="bio-logo-ring" aria-hidden="true" />
            )}
            {doc.profile.logo && assets.has(doc.profile.logo.assetId) ? (
              <Img
                ctx={ctx}
                image={doc.profile.logo}
                sizes={logoName ? "320px" : logoFree ? "220px" : "108px"}
                priority
                alt={logoName ? "" : undefined}
              />
            ) : (
              initials(doc.profile.name)
            )}
          </div>
          <h1 className={logoName ? "bio-name bio-sr" : "bio-name"}>
            {nameParts ? (
              <>
                {nameParts[0]}
                <span className="bio-name-accent">{nameParts[1]}</span>
              </>
            ) : (
              doc.profile.name
            )}
          </h1>
          {doc.profile.tagline && (
            <p className={logoName ? "bio-tagline bio-sr" : "bio-tagline"}>{doc.profile.tagline}</p>
          )}
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
                  {...tileProps(s.icon, "bio-gloss")}
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
        {std && (
          <p className="bio-sign">
            <span>
              {doc.profile.name}
              {doc.profile.city ? ` · ${doc.profile.city}` : ""}
            </span>
          </p>
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
