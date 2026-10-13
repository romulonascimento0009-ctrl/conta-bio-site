import type { SectionOf, SectionType } from "@/sites/sections";
import type { RenderContext } from "./context";
import {
  BookingButton,
  Container,
  formatDuration,
  formatPrice,
  SectionHeading,
  SiteImage,
} from "./primitives";

type Props<T extends SectionType> = {
  ctx: RenderContext;
  section: SectionOf<T>;
  first: boolean;
};

export function Hero({ ctx, section, first }: Props<"hero">) {
  const { heading, subheading, image, ctaLabel } = section.props;
  const Title = first ? "h1" : "h2";
  const hasImage = !!(image && ctx.assets.get(image.assetId));
  const title = (
    <Title
      id={`${section.id}-titulo`}
      className={`font-site-heading text-[2.5rem] leading-[1.05] md:text-[4rem] ${ctx.headingClass}`}
    >
      {heading}
    </Title>
  );
  const text = (
    <>
      {title}
      {subheading && (
        <p className="mt-5 max-w-[34ch] text-lg text-site-muted md:text-xl">{subheading}</p>
      )}
      <BookingButton ctx={ctx} label={ctaLabel} className="mt-8" />
    </>
  );

  if (section.variant === "image-full" && hasImage) {
    return (
      <section aria-labelledby={`${section.id}-titulo`}>
        <SiteImage
          ctx={ctx}
          image={image}
          sizes="100vw"
          priority={first}
          className="aspect-4/5 w-full object-cover md:aspect-21/9"
        />
        <Container className="py-12 md:py-16">{text}</Container>
      </section>
    );
  }

  return (
    <section aria-labelledby={`${section.id}-titulo`}>
      <Container
        className={`grid items-center gap-10 py-12 md:py-20 ${hasImage ? "md:grid-cols-[1.1fr_1fr]" : ""}`}
      >
        <div className={hasImage ? "order-2 md:order-1" : ""}>{text}</div>
        {hasImage && (
          <SiteImage
            ctx={ctx}
            image={image}
            sizes="(min-width: 768px) 45vw, 100vw"
            priority={first}
            className="order-1 aspect-4/5 w-full rounded-(--site-radius) object-cover md:order-2"
          />
        )}
      </Container>
    </section>
  );
}

export function About({ ctx, section }: Props<"about">) {
  const { heading, body, image } = section.props;
  const showImage = section.variant === "portrait" && !!(image && ctx.assets.get(image.assetId));
  return (
    <section aria-labelledby={`${section.id}-titulo`} className="py-16 md:py-24">
      <Container
        className={`grid gap-10 ${showImage ? "md:grid-cols-[2fr_3fr] md:items-center" : ""}`}
      >
        {showImage && (
          <SiteImage
            ctx={ctx}
            image={image}
            sizes="(min-width: 768px) 38vw, 100vw"
            className="aspect-3/4 w-full rounded-(--site-radius) object-cover"
          />
        )}
        <div>
          <SectionHeading ctx={ctx} id={`${section.id}-titulo`}>
            {heading}
          </SectionHeading>
          <div className="mt-6 max-w-[62ch] space-y-4 text-site-text">
            {body.split(/\n{2,}/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}

export function Services({ ctx, section }: Props<"services">) {
  const { heading, intro, categories } = section.props;
  return (
    <section aria-labelledby={`${section.id}-titulo`} className="bg-site-surface py-16 md:py-24">
      <Container>
        <SectionHeading ctx={ctx} id={`${section.id}-titulo`}>
          {heading}
        </SectionHeading>
        {intro && <p className="mt-4 max-w-[62ch] text-site-muted">{intro}</p>}
        <div className="mt-10 grid gap-x-16 gap-y-12 md:grid-cols-2">
          {categories.map((cat, ci) => (
            <div key={ci}>
              {cat.name && (
                <h3 className={`mb-4 font-site-heading text-2xl ${ctx.headingClass}`}>
                  {cat.name}
                </h3>
              )}
              <ul className="space-y-5">
                {cat.items.map((item, ii) => (
                  <li key={ii}>
                    <div className="flex items-baseline gap-3">
                      <span className="font-semibold">{item.name}</span>
                      <span
                        aria-hidden="true"
                        className="min-w-6 flex-1 border-b border-dotted border-site-muted"
                      />
                      <span className="font-semibold whitespace-nowrap tabular-nums">
                        {item.priceCents === undefined
                          ? "sob consulta"
                          : `${item.priceFrom ? "a partir de " : ""}${formatPrice(item.priceCents)}`}
                      </span>
                    </div>
                    {(item.description || item.durationMinutes) && (
                      <p className="mt-1 text-sm text-site-muted">
                        {[
                          item.description,
                          item.durationMinutes && formatDuration(item.durationMinutes),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}

export function Gallery({ ctx, section }: Props<"gallery">) {
  const { heading } = section.props;
  const images = section.props.images.filter((img) => ctx.assets.has(img.assetId));
  if (images.length === 0) return null;
  const mosaic = section.variant === "mosaic";
  return (
    <section aria-labelledby={`${section.id}-titulo`} className="py-16 md:py-24">
      <Container>
        <SectionHeading ctx={ctx} id={`${section.id}-titulo`}>
          {heading}
        </SectionHeading>
        <ul className="mt-10 grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
          {images.map((img, i) => {
            const big = mosaic && i === 0;
            return (
              <li key={`${img.assetId}-${i}`} className={big ? "col-span-2 row-span-2" : ""}>
                <SiteImage
                  ctx={ctx}
                  image={img}
                  sizes={big ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"}
                  className={`h-full w-full rounded-(--site-radius) object-cover ${mosaic ? "aspect-square" : "aspect-4/5"}`}
                />
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}

export function Testimonials({ ctx, section }: Props<"testimonials">) {
  const [main, ...rest] = section.props.items;
  return (
    <section aria-labelledby={`${section.id}-titulo`} className="py-16 md:py-24">
      <Container>
        <SectionHeading ctx={ctx} id={`${section.id}-titulo`}>
          {section.props.heading}
        </SectionHeading>
        <figure className="mt-10 max-w-[40ch]">
          <blockquote
            className={`font-site-heading text-2xl leading-snug md:text-3xl ${ctx.headingClass}`}
          >
            <p>“{main.quote}”</p>
          </blockquote>
          <figcaption className="mt-4 text-site-muted">— {main.author}</figcaption>
        </figure>
        {rest.length > 0 && (
          <div className="mt-12 grid gap-8 md:grid-cols-2">
            {rest.map((t, i) => (
              <figure key={i} className="border-l-2 border-site-primary pl-5">
                <blockquote>
                  <p>“{t.quote}”</p>
                </blockquote>
                <figcaption className="mt-2 text-sm text-site-muted">— {t.author}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

export function ContactInfo({ ctx, section }: Props<"contact">) {
  const c = ctx.doc.contact;
  const { heading, hours } = section.props;
  return (
    <section aria-labelledby={`${section.id}-titulo`} className="bg-site-surface py-16 md:py-24">
      <Container className="grid gap-12 md:grid-cols-2">
        <div>
          <SectionHeading ctx={ctx} id={`${section.id}-titulo`}>
            {heading}
          </SectionHeading>
          <address className="mt-6 space-y-3 not-italic">
            {c.address && (
              <p>
                {c.address.line}
                <br />
                {c.address.city}
                {c.address.mapUrl && (
                  <>
                    <br />
                    <a
                      href={c.address.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      Ver no mapa
                    </a>
                  </>
                )}
              </p>
            )}
            {c.whatsapp && (
              <p>
                WhatsApp:{" "}
                <a
                  href={`https://wa.me/${c.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-4"
                >
                  {formatPhone(c.whatsapp)}
                </a>
              </p>
            )}
            {c.phone && (
              <p>
                Telefone:{" "}
                <a
                  href={`tel:${c.phone.replace(/[^\d+]/g, "")}`}
                  className="underline underline-offset-4"
                >
                  {c.phone}
                </a>
              </p>
            )}
            {c.email && (
              <p>
                E-mail:{" "}
                <a href={`mailto:${c.email}`} className="underline underline-offset-4">
                  {c.email}
                </a>
              </p>
            )}
          </address>
        </div>
        {hours.length > 0 && (
          <div>
            <h3 className={`font-site-heading text-2xl ${ctx.headingClass}`}>Horários</h3>
            <dl className="mt-6 divide-y divide-site-muted/30">
              {hours.map((h, i) => (
                <div key={i} className="flex justify-between gap-4 py-3">
                  <dt>{h.days}</dt>
                  <dd className="tabular-nums">{h.time}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </Container>
    </section>
  );
}

export function Cta({ ctx, section }: Props<"cta">) {
  const { heading, text, ctaLabel } = section.props;
  return (
    <section
      aria-labelledby={`${section.id}-titulo`}
      className="bg-site-primary py-16 text-site-on-primary md:py-20"
    >
      <Container className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2
            id={`${section.id}-titulo`}
            className={`font-site-heading text-[2rem] leading-tight md:text-[2.5rem] ${ctx.headingClass}`}
          >
            {heading}
          </h2>
          {text && <p className="mt-3 max-w-[50ch]">{text}</p>}
        </div>
        <BookingButton ctx={ctx} label={ctaLabel} inverted />
      </Container>
    </section>
  );
}

/** 5511999998888 → +55 11 99999-8888 (apenas Brasil; outros países sem formatação). */
export function formatPhone(digits: string): string {
  const m = digits.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : `+${digits}`;
}
