/**
 * Vídeos dos sites (D50): o arquivo é guardado como chegou, em partes de tamanho fixo, e servido
 * aos pedaços (cabeçalho Range), como o navegador pede vídeo. Nada é recodificado no servidor:
 * o painel confere no navegador se o vídeo abre, a duração e tira a capa.
 */

/** Tamanho de cada parte enviada e guardada (abaixo do limite de 4,5 MB por envio). */
export const VIDEO_PART_BYTES = 3 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 30 * 1024 * 1024;
export const MAX_VIDEO_MS = 60_000;
/** Maior pedaço devolvido por resposta (a função da Netlify tem limite de tamanho de resposta). */
export const MAX_RANGE_BYTES = 2 * 1024 * 1024;

export const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;
export type VideoMime = keyof typeof VIDEO_TYPES;

export class VideoRejected extends Error {}

/**
 * Formato real pelo começo do arquivo (não pela extensão): MP4/MOV têm a caixa `ftyp` nos
 * bytes 4–7 (a marca `qt  ` é QuickTime); WebM começa com a assinatura EBML.
 */
export function sniffVideo(head: Uint8Array): VideoMime | null {
  const ascii = (from: number, to: number) => String.fromCharCode(...head.subarray(from, to));
  if (head.length >= 12 && ascii(4, 8) === "ftyp") {
    return ascii(8, 12) === "qt  " ? "video/quicktime" : "video/mp4";
  }
  if (
    head.length >= 4 &&
    head[0] === 0x1a &&
    head[1] === 0x45 &&
    head[2] === 0xdf &&
    head[3] === 0xa3
  )
    return "video/webm";
  return null;
}

export const partCount = (bytes: number) => Math.ceil(bytes / VIDEO_PART_BYTES);

/** Tamanho esperado da parte `index` (todas cheias, menos talvez a última). */
export function partSize(bytes: number, index: number): number {
  const last = partCount(bytes) - 1;
  if (index < 0 || index > last) return 0;
  return index < last ? VIDEO_PART_BYTES : bytes - last * VIDEO_PART_BYTES;
}

/**
 * Trecho pedido pelo cabeçalho Range, limitado a `MAX_RANGE_BYTES` (o navegador pede o resto
 * depois). Sem cabeçalho: o começo do arquivo. Pedido fora do arquivo ou mal formado: `null`.
 */
export function parseRange(
  header: string | null,
  size: number,
  max = MAX_RANGE_BYTES,
): { start: number; end: number } | null {
  if (!header) return { start: 0, end: Math.min(size, max) - 1 };
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === "" && m[2] === "")) return null;
  let start: number;
  let end: number;
  if (m[1] === "") {
    // "bytes=-500": os últimos 500 bytes.
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || end < start) return null;
  return { start, end: Math.min(end, start + max - 1) };
}

/** Partes que cobrem o trecho e onde ele começa na primeira delas. */
export function partsForRange(
  start: number,
  end: number,
): { first: number; last: number; offset: number } {
  return {
    first: Math.floor(start / VIDEO_PART_BYTES),
    last: Math.floor(end / VIDEO_PART_BYTES),
    offset: start % VIDEO_PART_BYTES,
  };
}
