/**
 * Cria (ou recria) o cliente de demonstração "demo" com todas as seções, imagens geradas
 * e uma versão publicada. Uso: npm run seed:demo  →  http://demo.localhost:3000
 * Só mexe no cliente com slug "demo".
 */
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { variantKey } from "@/data/assets";
import { closeDb, db } from "@/db";
import { assets, clients, sites, siteVersions } from "@/db/schema";
import { storage } from "@/lib/storage";
import { processImage } from "@/media/process";
import { validateSiteDocument, type SiteDocument } from "@/sites/document";
import { THEME_PRESETS, type ThemePresetId } from "@/sites/presets";

const SLUG = "demo";
const PRESET = (process.env.DEMO_THEME as ThemePresetId) || "atelie";

/** Imagem abstrata de placeholder (gradiente) nas cores do tema. */
async function placeholder(
  width: number,
  height: number,
  from: string,
  to: string,
): Promise<Buffer> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${width * 0.7}" cy="${height * 0.35}" r="${Math.min(width, height) * 0.22}" fill="${to}" opacity="0.35"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
}

async function main() {
  const existing = await db.select().from(clients).where(eq(clients.slug, SLUG));
  for (const c of existing) {
    await db.delete(clients).where(eq(clients.id, c.id));
    await storage().deletePrefix(`clients/${c.id}`);
  }

  const [client] = await db
    .insert(clients)
    .values({
      name: "Studio Demo",
      slug: SLUG,
      status: "published",
      notes: "Cliente de demonstração.",
    })
    .returning();

  const { colors } = THEME_PRESETS[PRESET].theme;
  const specs = [
    { w: 1600, h: 2000, alt: "Cliente com cabelo recém-finalizado" },
    { w: 1200, h: 1600, alt: "Retrato da profissional no estúdio" },
    { w: 1600, h: 1600, alt: "Coloração em tons de cobre" },
    { w: 1200, h: 1200, alt: "Corte curto texturizado" },
    { w: 1200, h: 1200, alt: "Penteado para festa" },
    { w: 1200, h: 1200, alt: "Tratamento de hidratação" },
    { w: 1200, h: 1200, alt: "Ambiente do estúdio" },
  ];
  const ids: string[] = [];
  for (const [i, s] of specs.entries()) {
    const processed = await processImage(
      await placeholder(
        s.w,
        s.h,
        i % 2 ? colors.surface : colors.primary,
        i % 2 ? colors.primary : colors.surface,
      ),
    );
    const id = crypto.randomUUID();
    for (const v of processed.variants)
      await storage().put(variantKey(client.id, id, v.width), v.data);
    await db.insert(assets).values({
      id,
      clientId: client.id,
      originalName: `demo-${i + 1}.jpg`,
      width: processed.width,
      height: processed.height,
      variants: processed.variants.map((v) => v.width),
      bytes: processed.variants.reduce((n, v) => n + v.data.byteLength, 0),
      alt: s.alt,
    });
    ids.push(id);
  }
  const img = (i: number) => ({ assetId: ids[i], alt: specs[i].alt });

  const doc: SiteDocument = {
    schemaVersion: 1,
    meta: {
      title: "Studio Demo — cabelo e coloração",
      description:
        "Cortes, coloração e tratamentos com hora marcada em São Paulo. Veja preços e agende.",
    },
    theme: structuredClone(THEME_PRESETS[PRESET].theme),
    contact: {
      businessName: "Studio Demo",
      whatsapp: "5511999998888",
      instagram: "studio.demo",
      email: "contato@studiodemo.com.br",
      address: {
        line: "Rua das Flores, 120 — Vila Madalena",
        city: "São Paulo, SP",
        mapUrl: "https://maps.google.com/?q=Rua+das+Flores+120",
      },
    },
    sections: [
      {
        id: "abertura",
        type: "hero",
        variant: "split",
        hidden: false,
        props: {
          heading: "Cabelo que conversa com quem você é",
          subheading: "Corte, cor e cuidado sem pressa, num estúdio pequeno na Vila Madalena.",
          image: img(0),
          ctaLabel: "Agendar horário",
        },
      },
      {
        id: "sobre",
        type: "about",
        variant: "portrait",
        hidden: false,
        props: {
          heading: "Sobre a Ana",
          body: "Há 12 anos cuido de cabelos cacheados, crespos e lisos com o mesmo princípio: entender a rotina de cada pessoa antes de pegar a tesoura.\n\nAtendo uma cliente por vez, com café passado na hora e tempo para conversar sobre o que você quer.",
          image: img(1),
        },
      },
      {
        id: "servicos",
        type: "services",
        variant: "price-list",
        hidden: false,
        props: {
          heading: "Serviços e preços",
          intro: "Valores para cabelo médio. Cabelos longos podem ter acréscimo, combinado antes.",
          categories: [
            {
              name: "Corte",
              items: [
                {
                  name: "Corte feminino",
                  priceCents: 12000,
                  priceFrom: false,
                  durationMinutes: 60,
                },
                {
                  name: "Corte de cachos a seco",
                  description: "Fio a fio, respeitando a curvatura",
                  priceCents: 16000,
                  priceFrom: false,
                  durationMinutes: 90,
                },
                { name: "Franja", priceCents: 4000, priceFrom: false },
              ],
            },
            {
              name: "Cor",
              items: [
                { name: "Coloração", priceCents: 18000, priceFrom: true, durationMinutes: 120 },
                { name: "Mechas", priceCents: 35000, priceFrom: true, durationMinutes: 240 },
                { name: "Tonalização", priceCents: 9000, priceFrom: false },
              ],
            },
            {
              name: "Tratamento",
              items: [
                {
                  name: "Hidratação profunda",
                  priceCents: 11000,
                  priceFrom: false,
                  durationMinutes: 50,
                },
                { name: "Cronograma capilar", description: "4 sessões", priceFrom: false },
              ],
            },
          ],
        },
      },
      {
        id: "galeria",
        type: "gallery",
        variant: "mosaic",
        hidden: false,
        props: { heading: "Trabalhos recentes", images: [img(2), img(3), img(4), img(5), img(6)] },
      },
      {
        id: "depoimentos",
        type: "testimonials",
        variant: "quote",
        hidden: false,
        props: {
          heading: "Quem já passou por aqui",
          items: [
            {
              quote: "Primeira vez que saí de um salão sabendo cuidar do meu cacho em casa.",
              author: "Juliana R.",
            },
            {
              quote: "A Ana escuta de verdade. A cor ficou exatamente como eu imaginava.",
              author: "Marcela T.",
            },
            {
              quote: "Ambiente tranquilo e pontualidade. Virei cliente fixa.",
              author: "Beatriz S.",
            },
          ],
        },
      },
      {
        id: "contato",
        type: "contact",
        variant: "default",
        hidden: false,
        props: {
          heading: "Onde estamos",
          hours: [
            { days: "Terça a sexta", time: "10h às 19h" },
            { days: "Sábado", time: "9h às 16h" },
            { days: "Domingo e segunda", time: "Fechado" },
          ],
        },
      },
      {
        id: "chamada",
        type: "cta",
        variant: "band",
        hidden: false,
        props: {
          heading: "Vamos marcar seu horário?",
          text: "Respondo pelo WhatsApp em até um dia útil.",
          ctaLabel: "Chamar no WhatsApp",
        },
      },
    ],
  };

  const result = validateSiteDocument(doc);
  if (!result.ok) throw new Error(JSON.stringify(result.issues, null, 2));

  const [site] = await db
    .insert(sites)
    .values({ clientId: client.id, draft: result.document })
    .returning();
  const [version] = await db
    .insert(siteVersions)
    .values({ siteId: site.id, document: result.document, note: "Demonstração" })
    .returning();
  await db.update(sites).set({ publishedVersionId: version.id }).where(eq(sites.id, site.id));

  console.log(`Demo publicado (tema ${PRESET}): cliente ${client.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closeDb);
