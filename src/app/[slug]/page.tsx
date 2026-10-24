import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { slugSchema } from "@/clients/slug";
import { getPublishedSiteBySlug } from "@/data/sites";
import { env } from "@/lib/env";
import { BioRenderer } from "@/sites/render/BioRenderer";
import { mediaUrl } from "@/sites/render/media";

/**
 * Bio Site público em <PUBLIC_URL>/<slug>. Rotas do sistema (/admin, /login…) têm precedência
 * por serem estáticas, e os nomes delas são reservados em `RESERVED_SLUGS`.
 */
const load = cache(async (slug: string) => {
  const parsed = slugSchema.safeParse(slug);
  return parsed.success && parsed.data === slug ? getPublishedSiteBySlug(slug) : null;
});

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const site = await load(slug);
  if (!site) return {};
  const { meta, profile } = site.document;
  const logo = profile.logo && site.assets.get(profile.logo.assetId);
  const ogWidth = logo?.variants.find((w) => w >= 480) ?? logo?.variants.at(-1);

  return {
    metadataBase: new URL(env().PUBLIC_URL),
    title: meta.title,
    description: meta.description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${slug}`,
      locale: "pt_BR",
      type: "website",
      images:
        logo && ogWidth ? [{ url: mediaUrl(logo.id, ogWidth), alt: profile.name }] : undefined,
    },
  };
}

export default async function PublicBioPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const site = await load(slug);
  if (!site) notFound();
  return (
    <BioRenderer
      doc={site.document}
      assets={site.assets}
      trackSlug={slug}
      publicUrl={env().PUBLIC_URL}
    />
  );
}
