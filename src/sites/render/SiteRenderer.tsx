import type { CSSProperties } from "react";
import type { AssetInfo } from "@/data/assets";
import { bookingHref, type SiteDocument } from "@/sites/document";
import { FONTS } from "@/sites/fonts";
import type { Section } from "@/sites/sections";
import type { RenderContext } from "./context";
import { loadedFont } from "./fonts";
import { BookingButton, Container, SiteImage } from "./primitives";
import { About, ContactInfo, Cta, Gallery, Hero, Services, Testimonials } from "./sections";

const RADIUS = {
  none: { box: "0", button: "0" },
  soft: { box: "0.5rem", button: "0.5rem" },
  round: { box: "1.25rem", button: "999px" },
} as const;

function renderSection(ctx: RenderContext, section: Section, first: boolean) {
  switch (section.type) {
    case "hero":
      return <Hero ctx={ctx} section={section} first={first} />;
    case "about":
      return <About ctx={ctx} section={section} first={first} />;
    case "services":
      return <Services ctx={ctx} section={section} first={first} />;
    case "gallery":
      return <Gallery ctx={ctx} section={section} first={first} />;
    case "testimonials":
      return <Testimonials ctx={ctx} section={section} first={first} />;
    case "contact":
      return <ContactInfo ctx={ctx} section={section} first={first} />;
    case "cta":
      return <Cta ctx={ctx} section={section} first={first} />;
  }
}

/** Renderiza um SiteDocument validado. Componente de servidor, sem JavaScript no cliente. */
export function SiteRenderer({
  doc,
  assets,
}: {
  doc: SiteDocument;
  assets: Map<string, AssetInfo>;
}) {
  const { colors, fonts, radius } = doc.theme;
  const heading = loadedFont(fonts.heading);
  const body = loadedFont(fonts.body);
  const serifHeading = FONTS[fonts.heading].category === "serif";

  const ctx: RenderContext = {
    doc,
    assets,
    booking: bookingHref(doc.contact),
    headingClass: serifHeading ? "font-medium tracking-[-0.01em]" : "font-bold tracking-[-0.02em]",
  };

  const style = {
    "--site-bg": colors.background,
    "--site-surface": colors.surface,
    "--site-text": colors.text,
    "--site-muted": colors.muted,
    "--site-primary": colors.primary,
    "--site-on-primary": colors.onPrimary,
    "--site-font-heading": heading.family,
    "--site-font-body": body.family,
    "--site-radius": RADIUS[radius].box,
    "--site-radius-btn": RADIUS[radius].button,
  } as CSSProperties;

  const visible = doc.sections.filter((s) => !s.hidden);
  const firstIsHero = visible[0]?.type === "hero";
  const c = doc.contact;
  const socials = [
    c.instagram && { label: "Instagram", href: `https://instagram.com/${c.instagram}` },
    c.tiktok && { label: "TikTok", href: `https://www.tiktok.com/@${c.tiktok}` },
    c.facebookUrl && { label: "Facebook", href: c.facebookUrl },
  ].filter((s): s is { label: string; href: string } => !!s);

  return (
    <div
      style={style}
      className={`${heading.variable} ${body.variable} min-h-screen bg-site-bg pb-20 font-site-body text-[1.0625rem] leading-relaxed text-site-text md:pb-0`}
    >
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-site-bg focus:px-4 focus:py-2"
      >
        Pular para o conteúdo
      </a>
      <header>
        <Container className="flex items-center justify-between gap-4 py-5">
          {c.logo && ctx.assets.has(c.logo.assetId) ? (
            <SiteImage ctx={ctx} image={c.logo} sizes="160px" className="h-10 w-auto" />
          ) : (
            <span className={`font-site-heading text-xl ${ctx.headingClass}`}>
              {c.businessName}
            </span>
          )}
          {/* No celular a barra fixa inferior cumpre esse papel. */}
          <div className="hidden md:block">
            <BookingButton ctx={ctx} label="Agendar" className="min-h-10 px-5 text-sm" />
          </div>
        </Container>
      </header>

      <main id="conteudo">
        {!firstIsHero && <h1 className="sr-only">{c.businessName}</h1>}
        {visible.map((s, i) => (
          <div key={s.id} data-section-id={s.id}>
            {renderSection(ctx, s, i === 0)}
          </div>
        ))}
      </main>

      <footer className="py-10">
        <Container className="flex flex-col gap-4 text-sm text-site-muted md:flex-row md:items-center md:justify-between">
          <p>
            © {new Date().getFullYear()} {c.businessName}
          </p>
          {socials.length > 0 && (
            <ul className="flex gap-5">
              {socials.map((s) => (
                <li key={s.label}>
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-4"
                  >
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </footer>

      {/* Barra fixa de agendamento no celular, ao alcance do polegar. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-site-muted/20 bg-site-bg/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <BookingButton ctx={ctx} label="Agendar horário" className="w-full" />
      </div>
    </div>
  );
}
