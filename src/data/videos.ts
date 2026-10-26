import { and, desc, eq, gt, inArray, lt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sites, siteVersions, videos } from "@/db/schema";
import { clientKey, storage } from "@/lib/storage";
import {
  MAX_VIDEO_BYTES,
  MAX_VIDEO_MS,
  partCount,
  partSize,
  sniffVideo,
  VIDEO_TYPES,
  VideoRejected,
  type VideoMime,
} from "@/media/video";
import { collectVideoRefs, validateBio } from "@/sites/bio";
import { AssetInUse, deleteAsset, uploadAsset } from "./assets";
import { recordAudit } from "./audit";
import { getClient } from "./clients";

export type Video = typeof videos.$inferSelect;
/** Dados mínimos de um vídeo para renderizar (tipo, dimensões, capa). */
export type VideoInfo = Pick<Video, "id" | "mime" | "width" | "height" | "posterAssetId">;

const isUuid = (id: string) => z.uuid().safeParse(id).success;

export function videoPartKey(clientId: string, videoId: string, index: number): string {
  return clientKey(clientId, "videos", videoId, `${index}.part`);
}

const startSchema = z.object({
  name: z.string().trim().min(1).max(200),
  mime: z.enum(Object.keys(VIDEO_TYPES) as [VideoMime, ...VideoMime[]], "Formato não aceito."),
  bytes: z.int().min(1).max(MAX_VIDEO_BYTES, "Vídeo maior que 30 MB."),
  width: z.int().min(16).max(8192),
  height: z.int().min(16).max(8192),
  durationMs: z.int().min(1).max(MAX_VIDEO_MS, "Vídeo com mais de 60 segundos."),
});
export type VideoStart = z.input<typeof startSchema>;

/** Começa um envio: reserva o id (o vídeo só aparece depois de `finishVideoUpload`). */
export async function startVideoUpload(clientId: string, input: VideoStart): Promise<string> {
  const client = await getClient(clientId);
  if (!client) throw new Error("Cliente não encontrado.");
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) throw new VideoRejected(parsed.error.issues[0].message);

  // Envios abandonados há mais de um dia: apaga as partes que chegaram.
  const stale = await db
    .select({ id: videos.id })
    .from(videos)
    .where(
      and(
        eq(videos.clientId, client.id),
        eq(videos.parts, 0),
        lt(videos.createdAt, new Date(Date.now() - 86_400_000)),
      ),
    );
  for (const v of stale) {
    await storage().deletePrefix(clientKey(client.id, "videos", v.id));
    await db.delete(videos).where(eq(videos.id, v.id));
  }

  const [row] = await db
    .insert(videos)
    .values({ clientId: client.id, originalName: parsed.data.name, ...parsed.data })
    .returning({ id: videos.id });
  return row.id;
}

async function pendingVideo(clientId: string, videoId: string): Promise<Video | null> {
  const client = await getClient(clientId);
  if (!client || !isUuid(videoId)) return null;
  const [row] = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.clientId, client.id), eq(videos.parts, 0)));
  return row ?? null;
}

/** Recebe uma parte; a primeira precisa ser mesmo do formato declarado. */
export async function uploadVideoPart(
  clientId: string,
  videoId: string,
  index: number,
  data: Uint8Array,
): Promise<void> {
  const video = await pendingVideo(clientId, videoId);
  if (!video) throw new VideoRejected("Envio não encontrado. Comece de novo.");
  if (!Number.isInteger(index) || data.byteLength !== partSize(video.bytes, index))
    throw new VideoRejected("Parte do vídeo com tamanho inesperado. Comece de novo.");
  if (index === 0) {
    const real = sniffVideo(data.subarray(0, 16));
    // MP4 e MOV têm a mesma estrutura; o navegador às vezes rotula um como o outro.
    const family = (m: string | null) => (m === "video/webm" ? "webm" : m ? "mp4" : null);
    if (!real || family(real) !== family(video.mime))
      throw new VideoRejected("O arquivo não é um vídeo MP4, MOV ou WebM.");
  }
  await storage().put(videoPartKey(video.clientId, video.id, index), data);
}

/** Confere se todas as partes chegaram, guarda a capa e libera o vídeo para o editor. */
export async function finishVideoUpload(
  clientId: string,
  videoId: string,
  poster: File,
): Promise<Video> {
  const video = await pendingVideo(clientId, videoId);
  if (!video) throw new VideoRejected("Envio não encontrado. Comece de novo.");
  const n = partCount(video.bytes);
  for (let i = 0; i < n; i++) {
    const part = await storage().get(videoPartKey(video.clientId, video.id, i));
    if (!part || part.byteLength !== partSize(video.bytes, i))
      throw new VideoRejected("O envio ficou incompleto. Tente de novo.");
  }
  const cover = await uploadAsset(video.clientId, poster, `Capa do vídeo ${video.originalName}`);
  const [row] = await db
    .update(videos)
    .set({ parts: n, posterAssetId: cover.id })
    .where(eq(videos.id, video.id))
    .returning();
  await recordAudit(video.clientId, "video.upload", { name: video.originalName });
  return row;
}

/** Vídeos prontos do cliente, do mais novo ao mais antigo. */
export async function listVideos(clientId: string): Promise<Video[]> {
  const client = await getClient(clientId);
  if (!client) return [];
  return db
    .select()
    .from(videos)
    .where(and(eq(videos.clientId, client.id), gt(videos.parts, 0)))
    .orderBy(desc(videos.createdAt));
}

export class VideoInUse extends Error {
  constructor() {
    super("Este vídeo está em uso no site (rascunho ou versão publicada). Remova-o do site antes.");
  }
}

/** Exclui o vídeo (e a capa) se não estiver no rascunho nem na versão publicada. */
export async function deleteVideo(clientId: string, videoId: string): Promise<void> {
  const client = await getClient(clientId);
  if (!client || !isUuid(videoId)) return;
  const [video] = await db
    .select()
    .from(videos)
    .where(and(eq(videos.id, videoId), eq(videos.clientId, client.id)));
  if (!video) return;

  const [site] = await db.select().from(sites).where(eq(sites.clientId, client.id));
  if (site) {
    const docs: unknown[] = [site.draft];
    if (site.publishedVersionId) {
      const [v] = await db
        .select()
        .from(siteVersions)
        .where(eq(siteVersions.id, site.publishedVersionId));
      if (v) docs.push(v.document);
    }
    for (const raw of docs) {
      const parsed = validateBio(raw);
      if (parsed.ok && collectVideoRefs(parsed.document).some((r) => r.videoId === videoId))
        throw new VideoInUse();
    }
  }

  await db.delete(videos).where(eq(videos.id, video.id));
  await storage().deletePrefix(clientKey(client.id, "videos", video.id));
  // A capa vai junto, a não ser que também esteja em uso no site como foto (aí fica nas imagens).
  if (video.posterAssetId)
    await deleteAsset(client.id, video.posterAssetId).catch((err: unknown) => {
      if (!(err instanceof AssetInUse)) throw err;
    });
  await recordAudit(client.id, "video.delete", { name: video.originalName });
}

/** Vídeos prontos do cliente com os ids informados (ignora ids de outros clientes). */
export async function videosOfClient(
  clientId: string,
  ids: string[],
): Promise<Map<string, VideoInfo>> {
  const unique = [...new Set(ids)].filter(isUuid);
  if (unique.length === 0) return new Map();
  const rows = await db
    .select({
      id: videos.id,
      mime: videos.mime,
      width: videos.width,
      height: videos.height,
      posterAssetId: videos.posterAssetId,
    })
    .from(videos)
    .where(and(eq(videos.clientId, clientId), inArray(videos.id, unique), gt(videos.parts, 0)));
  return new Map(rows.map((r) => [r.id, r]));
}

/** Para a rota pública de mídia: vídeo pronto, com o necessário para servir os pedaços. */
export async function findVideoFile(
  videoId: string,
): Promise<Pick<Video, "clientId" | "mime" | "bytes" | "parts"> | null> {
  if (!isUuid(videoId)) return null;
  const [row] = await db
    .select({
      clientId: videos.clientId,
      mime: videos.mime,
      bytes: videos.bytes,
      parts: videos.parts,
    })
    .from(videos)
    .where(and(eq(videos.id, videoId), gt(videos.parts, 0)));
  return row ?? null;
}
