import type { ReactNode } from "react";
import type { ImageRef } from "@/sites/sections";
import type { RenderContext } from "./context";

export function mediaUrl(assetId: string, width: number): string {
  return `/media/${assetId}/${width}.webp`;
}

/** <img> responsivo com srcset das variantes. Não renderiza nada se a imagem não existir. */
export function SiteImage({
  ctx,
  image,
  sizes,
  priority = false,
  className = "",
}: {
  ctx: RenderContext;
  image: ImageRef | undefined;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const info = image && ctx.assets.get(image.assetId);
  if (!image || !info) return null;
  const fallback = info.variants.find((w) => w >= 960) ?? info.variants.at(-1)!;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- variantes próprias, sem next/image
    <img
      src={mediaUrl(info.id, fallback)}
      srcSet={info.variants.map((w) => `${mediaUrl(info.id, w)} ${w}w`).join(", ")}
      sizes={sizes}
      width={info.width}
      height={info.height}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
    />
  );
}

export function BookingButton({
  ctx,
  label,
  inverted = false,
  className = "",
}: {
  ctx: RenderContext;
  label: string;
  inverted?: boolean;
  className?: string;
}) {
  const colors = inverted
    ? "bg-site-on-primary text-site-primary"
    : "bg-site-primary text-site-on-primary";
  return (
    <a
      href={ctx.booking}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-12 items-center justify-center rounded-(--site-radius-btn) px-6 font-semibold underline-offset-4 hover:underline ${colors} ${className}`}
    >
      {label}
    </a>
  );
}

export function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`mx-auto w-full max-w-5xl px-5 md:px-8 ${className}`}>{children}</div>;
}

export function SectionHeading({
  ctx,
  id,
  children,
}: {
  ctx: RenderContext;
  id: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      className={`font-site-heading text-[2rem] leading-tight md:text-[2.75rem] ${ctx.headingClass}`}
    >
      {children}
    </h2>
  );
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
