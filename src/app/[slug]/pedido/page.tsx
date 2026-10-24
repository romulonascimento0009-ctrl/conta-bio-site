import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { orderTotal } from "@/sites/catalog";
import { loadedFont } from "@/sites/render/fonts";
import { mediaUrl } from "@/sites/render/media";
import { loadOrder } from "./load";
import "./pedido.css";

/**
 * "Fotos do pedido" (D49): o WhatsApp não aceita anexos por link, então a mensagem do catálogo
 * leva este endereço. Mostra a foto grande de cada item; no WhatsApp, a prévia do link traz as
 * fotos montadas numa imagem só (`imagem/route.ts`). Fora das buscas.
 */
const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[slug]/pedido">): Promise<Metadata> {
  const { slug } = await params;
  const { i } = await searchParams;
  const param = typeof i === "string" ? i : undefined;
  const order = await loadOrder(slug, param);
  if (!order) return { robots: { index: false, follow: false } };
  const name = order.site.document.profile.name;
  const title = `Pedido · ${name}`;
  const description = order.lines
    .map((l) => `${l.qty}x ${l.prod.name}`)
    .join(", ")
    .slice(0, 200);
  const image = `/${slug}/pedido/imagem?i=${encodeURIComponent(param!)}`;
  return {
    metadataBase: new URL(env().PUBLIC_URL),
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      locale: "pt_BR",
      type: "website",
      images: [{ url: image, width: 1200, height: 630, alt: `Fotos do pedido na ${name}` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function OrderPage({ params, searchParams }: PageProps<"/[slug]/pedido">) {
  const { slug } = await params;
  const { i } = await searchParams;
  const order = await loadOrder(slug, typeof i === "string" ? i : undefined);
  if (!order) notFound();
  const { document: doc, assets } = order.site;
  const { colors, fonts } = doc.theme;
  const display = loadedFont(fonts.display);
  const body = loadedFont(fonts.body);
  const total = orderTotal(order.lines);
  const count = order.lines.reduce((n, l) => n + l.qty, 0);
  const logo = doc.profile.logo && assets.get(doc.profile.logo.assetId);

  const style = {
    "--base": colors.base,
    "--top": colors.cardTop,
    "--bottom": colors.cardBottom,
    "--text": doc.theme.cardText ?? "#ffffff",
    "--font-display": display.family,
    "--font-body": body.family,
  } as CSSProperties;

  return (
    <main className={`pedido ${display.variable} ${body.variable}`} style={style}>
      <header>
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element -- variantes próprias
          <img
            className="pedido-logo"
            src={mediaUrl(logo.id, logo.variants.find((w) => w >= 320) ?? logo.variants.at(-1)!)}
            alt=""
            width={logo.width}
            height={logo.height}
          />
        )}
        <h1>Pedido · {doc.profile.name}</h1>
        <p>
          {count} {count === 1 ? "item escolhido" : "itens escolhidos"} pelo Bio Site
        </p>
      </header>
      <ol className="pedido-itens">
        {order.lines.map((l) => {
          const info = assets.get(l.prod.image.assetId);
          const w = info && (info.variants.find((x) => x >= 480) ?? info.variants.at(-1)!);
          return (
            <li key={`${l.cat.id}.${l.prod.id}`}>
              {info && w && (
                // eslint-disable-next-line @next/next/no-img-element -- variantes próprias
                <img
                  src={mediaUrl(info.id, w)}
                  alt={l.prod.image.alt || l.prod.name}
                  width={info.width}
                  height={info.height}
                />
              )}
              <div>
                <strong>
                  {l.qty}x {l.prod.name}
                </strong>
                <span>{l.cat.name}</span>
                {l.prod.priceCents !== undefined && (
                  <span className="pedido-preco">{money(l.prod.priceCents * l.qty)}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="pedido-total">
        <span>Total</span>
        <span>{total === null ? "a confirmar" : money(total)}</span>
      </p>
      <a className="pedido-site" href={`/${slug}`}>
        Ver o Bio Site da {doc.profile.name}
      </a>
    </main>
  );
}
