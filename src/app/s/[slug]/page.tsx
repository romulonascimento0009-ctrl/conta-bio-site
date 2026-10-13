import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { slugSchema } from "@/clients/slug";
import { getPublishedSiteBySlug } from "@/data/sites";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/hosts";
import { SiteRenderer } from "@/sites/render/SiteRenderer";
import { mediaUrl } from "@/sites/render/primitives";

/** Site público. Acessado via <slug>.<ROOT_DOMAIN> (o proxy reescreve para esta rota). */
const load = cache(async (slug: string) => {
  const parsed = slugSchema.safeParse(slug);
  return parsed.success ? getPublishedSiteBySlug(parsed.data) : null;
});

export async function generateMetadata({ params }: PageProps<"/s/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const site = await load(slug);
  if (!site) return {};
  const { meta } = site.document;
  const hero = site.document.sections.find((s) => s.type === "hero" && !s.hidden);
  const heroImage = hero?.type === "hero" ? hero.props.image : undefined;
  const info = heroImage && site.assets.get(heroImage.assetId);
  const ogWidth = info?.variants.find((w) => w >= 960) ?? info?.variants.at(-1);

  return {
    metadataBase: new URL(siteUrl(slug, env().ROOT_DOMAIN)),
    title: meta.title,
    description: meta.description,
    robots: { index: true, follow: true },
    alternates: { canonical: "/" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      locale: "pt_BR",
      type: "website",
      images:
        info && ogWidth ? [{ url: mediaUrl(info.id, ogWidth), alt: heroImage.alt }] : undefined,
    },
  };
}

export default async function PublicSitePage({ params }: PageProps<"/s/[slug]">) {
  const { slug } = await params;
  const site = await load(slug);
  if (!site) notFound();
  return <SiteRenderer doc={site.document} assets={site.assets} />;
}
