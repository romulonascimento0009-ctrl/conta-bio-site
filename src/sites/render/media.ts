/** URL de uma variante de imagem servida por /media/<assetId>/<largura>.webp. */
export function mediaUrl(assetId: string, width: number): string {
  return `/media/${assetId}/${width}.webp`;
}

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

/** URL de um vídeo servido aos pedaços por /media/<videoId>/video.<ext>. */
export function videoUrl(videoId: string, mime: string): string {
  return `/media/${videoId}/video.${VIDEO_EXT[mime] ?? "mp4"}`;
}
