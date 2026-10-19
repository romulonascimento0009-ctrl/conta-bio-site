/**
 * (Re)cria três Bio Sites de demonstração publicados — padaria, salão e clínica — com imagens
 * geradas. Uso: npm run seed:demo → http://localhost:3000/demo-padaria (e demo-salao, demo-clinica).
 * Só mexe em clientes cujo endereço começa com "demo".
 */
import { eq, like, or } from "drizzle-orm";
import sharp from "sharp";
import { briefingSchema } from "@/clients/briefing";
import type { SegmentId } from "@/clients/segments";
import { variantKey } from "@/data/assets";
import { closeDb, db } from "@/db";
import { assets, clients, sites, siteVersions } from "@/db/schema";
import { storage } from "@/lib/storage";
import { processImage } from "@/media/process";
import { validateBio, type BioDocument, type ImageRef } from "@/sites/bio";
import { createBioDocument } from "@/sites/templates";
import { THEMES, type ThemeId } from "@/sites/themes";

type Demo = {
  slug: string;
  segment: SegmentId;
  theme: ThemeId;
  briefing: Record<string, string>;
  ticker: string[];
  gallery: string;
  /** Topo com "foto da fachada" (desenho gerado) em vez do fundo desfocado. */
  facade?: boolean;
  extra?: (doc: BioDocument) => void;
};

const DEMOS: Demo[] = [
  {
    slug: "demo-padaria",
    segment: "food",
    theme: "ambar",
    briefing: {
      businessName: "Forno da Serra",
      tagline: "Pão de fermentação natural, todo dia às 6h.",
      categories: "Pães, Doces, Salgados, Café",
      city: "Campinas/SP",
      instagram: "fornodaserra",
      whatsapp: "5519999998888",
      googleReviewUrl: "https://g.page/r/demo-forno/review",
      address: "Av. das Andorinhas, 210 — Taquaral, Campinas/SP",
      mainLinkUrl: "https://cardapio.exemplo.com.br/forno-da-serra",
      wifiNetwork: "FORNO-CLIENTES",
      wifiPassword: "paoquentinho",
      hours: "Seg a sex | 6h – 20h\nSábado | 6h – 18h\nDomingo | 7h – 12h",
    },
    ticker: ["Fornada das 6h", "Encomendas para festas", "Café coado na hora"],
    gallery: "Saindo do forno",
    facade: true,
    extra: (d) => {
      d.contact.googleRating = 4.9;
      d.contact.googleReviewCount = 312;
      setLink(d, "google", { value: "4,9 ★", subtitle: "312 avaliações" });
      setLink(d, "cardapio", { tag: "Novo" });
    },
  },
  {
    slug: "demo-salao",
    segment: "beauty",
    theme: "ameixa",
    briefing: {
      businessName: "Studio Lia Andrade",
      tagline: "Cachos, cor e cuidado sem pressa.",
      categories: "Corte, Coloração, Cachos",
      city: "Recife/PE",
      instagram: "studiolia.andrade",
      whatsapp: "5581988887777",
      googleReviewUrl: "https://g.page/r/demo-lia/review",
      address: "Rua da Aurora, 45 — Boa Vista, Recife/PE",
      mainLinkUrl: "https://agenda.exemplo.com.br/studio-lia",
      hours: "Ter a sex | 10h – 19h\nSábado | 9h – 16h",
    },
    ticker: ["Agenda aberta para novembro", "Consultoria de cachos"],
    gallery: "Antes e depois",
    extra: (d) => {
      d.contact.googleRating = 5;
      d.contact.googleReviewCount = 128;
    },
  },
  {
    slug: "demo-clinica",
    segment: "health",
    theme: "esmeralda",
    briefing: {
      businessName: "Vida Fisio",
      tagline: "Fisioterapia e pilates com atendimento individual.",
      categories: "Fisioterapia, Pilates, RPG",
      city: "Curitiba/PR",
      instagram: "vidafisio.cwb",
      whatsapp: "5541977776666",
      phone: "554133330000",
      googleReviewUrl: "https://g.page/r/demo-vida/review",
      address: "R. XV de Novembro, 900 — Centro, Curitiba/PR",
      wifiNetwork: "VIDAFISIO-PACIENTES",
      wifiPassword: "bemestar2026",
      hours: "Seg a sex | 7h – 21h\nSábado | 8h – 12h",
    },
    ticker: ["Aceitamos convênios", "Avaliação inicial", "Estacionamento no local"],
    gallery: "Nosso espaço",
    extra: (d) => {
      d.contact.googleRating = 4.8;
      d.contact.googleReviewCount = 96;
      const i = d.blocks.findIndex((b) => b.id === "telefone");
      d.blocks.splice(i, 0, {
        id: "convenios",
        type: "link",
        action: "url",
        icon: "shield",
        hidden: false,
        variant: "solid",
        title: "Convênios aceitos",
        subtitle: "Unimed, Amil, SulAmérica",
        url: "https://exemplo.com.br/convenios",
      });
    },
  },
];

/** Ajusta um cartão da demonstração, se existir. */
function setLink(d: BioDocument, id: string, patch: Record<string, unknown>) {
  const b = d.blocks.find((x) => x.id === id);
  if (b?.type === "link") Object.assign(b, patch);
}

/** "Foto" de fachada desenhada (toldo listrado, vitrines, porta) nas cores do tema. */
async function facade(awning: string, wall: string, glass: string): Promise<Buffer> {
  const stripes = Array.from(
    { length: 16 },
    (_, i) => `<rect x="${i * 80}" y="0" width="40" height="150" fill="#f4ead8"/>`,
  ).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8ec5e8"/><stop offset="1" stop-color="#f3d7b0"/></linearGradient>
    <linearGradient id="v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe6a8"/><stop offset="1" stop-color="${glass}"/></linearGradient></defs>
    <rect width="1200" height="900" fill="url(#s)"/>
    <rect y="120" width="1200" height="780" fill="${wall}"/>
    <rect x="200" y="190" width="800" height="100" rx="12" fill="#3a2010"/>
    <g transform="translate(60 330)"><rect width="1080" height="150" fill="${awning}"/>${stripes}</g>
    <rect x="100" y="520" width="400" height="330" fill="url(#v)" stroke="#3a2010" stroke-width="16"/>
    <rect x="700" y="520" width="400" height="330" fill="url(#v)" stroke="#3a2010" stroke-width="16"/>
    <rect x="530" y="500" width="140" height="400" fill="#4a2a12"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

/** Imagem de placeholder (degradê com formas) nas cores do tema. */
async function placeholder(w: number, h: number, a: string, b: string, c: string): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * 0.68}" cy="${h * 0.34}" r="${Math.min(w, h) * 0.22}" fill="${c}" opacity=".55"/>
    <circle cx="${w * 0.28}" cy="${h * 0.72}" r="${Math.min(w, h) * 0.14}" fill="#ffffff" opacity=".25"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function addImage(
  clientId: string,
  buf: Buffer,
  name: string,
  alt: string,
): Promise<ImageRef> {
  const processed = await processImage(buf);
  const id = crypto.randomUUID();
  for (const v of processed.variants)
    await storage().put(variantKey(clientId, id, v.width), v.data);
  await db.insert(assets).values({
    id,
    clientId,
    originalName: name,
    width: processed.width,
    height: processed.height,
    variants: processed.variants.map((v) => v.width),
    bytes: processed.variants.reduce((n, v) => n + v.data.byteLength, 0),
    alt,
  });
  return { assetId: id, alt };
}

async function main() {
  const old = await db
    .select()
    .from(clients)
    .where(or(eq(clients.slug, "demo"), like(clients.slug, "demo-%")));
  for (const c of old) {
    await db.delete(clients).where(eq(clients.id, c.id));
    await storage().deletePrefix(`clients/${c.id}`);
  }

  for (const demo of DEMOS) {
    const briefing = briefingSchema.parse(demo.briefing);
    const [client] = await db
      .insert(clients)
      .values({
        name: briefing.businessName,
        slug: demo.slug,
        segment: demo.segment,
        status: "published",
        notes: "Demonstração.",
      })
      .returning();

    const { colors } = THEMES[demo.theme].theme;
    const doc = createBioDocument({ segment: demo.segment, themeId: demo.theme, briefing });
    doc.profile.logo = await addImage(
      client.id,
      await placeholder(600, 600, colors.logoBg, colors.glow2, colors.cardTop),
      "logo.jpg",
      `Logo ${briefing.businessName}`,
    );
    doc.profile.background = demo.facade
      ? await addImage(
          client.id,
          await facade("#b8321f", "#d9b48a", colors.cardTop),
          "fachada.jpg",
          `Fachada da ${briefing.businessName}`,
        )
      : await addImage(
          client.id,
          await placeholder(1200, 1600, colors.glow1, colors.glow3, colors.glow2),
          "fundo.jpg",
          "",
        );
    if (demo.facade) doc.profile.backgroundMode = "cover";
    const images: ImageRef[] = [];
    for (let i = 0; i < 4; i++) {
      images.push(
        await addImage(
          client.id,
          await placeholder(
            900,
            900,
            i % 2 ? colors.glow2 : colors.glow1,
            colors.cardBottom,
            colors.accent,
          ),
          `foto-${i + 1}.jpg`,
          `${demo.gallery} — foto ${i + 1}`,
        ),
      );
    }
    const mapsIndex = doc.blocks.findIndex((b) => b.id === "como-chegar");
    doc.blocks.splice(mapsIndex, 0, {
      id: "galeria",
      type: "gallery",
      hidden: false,
      title: demo.gallery,
      images,
    });
    doc.ticker = { enabled: true, items: demo.ticker };
    demo.extra?.(doc);

    const result = validateBio(doc);
    if (!result.ok) throw new Error(`${demo.slug}: ${JSON.stringify(result.issues, null, 2)}`);
    const [site] = await db
      .insert(sites)
      .values({ clientId: client.id, draft: result.document })
      .returning();
    const [version] = await db
      .insert(siteVersions)
      .values({ siteId: site.id, document: result.document, note: "Demonstração" })
      .returning();
    await db.update(sites).set({ publishedVersionId: version.id }).where(eq(sites.id, site.id));
    console.log(`Publicado: /${demo.slug}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
