/** URL de uma variante de imagem servida por /media/<assetId>/<largura>.webp. */
export function mediaUrl(assetId: string, width: number): string {
  return `/media/${assetId}/${width}.webp`;
}
