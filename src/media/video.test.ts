import { describe, expect, it } from "vitest";
import {
  MAX_RANGE_BYTES,
  parseRange,
  partCount,
  partsForRange,
  partSize,
  sniffVideo,
  VIDEO_PART_BYTES,
} from "./video";

const bytes = (...parts: (string | number[])[]) =>
  new Uint8Array(
    parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
  );

describe("formato real do vídeo", () => {
  it("reconhece MP4, MOV e WebM pelo conteúdo", () => {
    expect(sniffVideo(bytes([0, 0, 0, 0x20], "ftypisom", [0, 0]))).toBe("video/mp4");
    expect(sniffVideo(bytes([0, 0, 0, 0x14], "ftypqt  ", [0, 0]))).toBe("video/quicktime");
    expect(sniffVideo(bytes([0x1a, 0x45, 0xdf, 0xa3], [0, 0, 0, 0]))).toBe("video/webm");
  });
  it("recusa o que não é vídeo (ex.: imagem renomeada)", () => {
    expect(sniffVideo(bytes([0xff, 0xd8, 0xff, 0xe0], "JFIF\0\0\0\0"))).toBeNull();
    expect(sniffVideo(bytes("GIF89a"))).toBeNull();
  });
});

describe("partes do envio", () => {
  it("todas cheias menos a última", () => {
    const size = VIDEO_PART_BYTES * 2 + 10;
    expect(partCount(size)).toBe(3);
    expect(partSize(size, 0)).toBe(VIDEO_PART_BYTES);
    expect(partSize(size, 2)).toBe(10);
    expect(partSize(size, 3)).toBe(0);
    expect(partSize(size, -1)).toBe(0);
  });
});

describe("trechos pedidos pelo navegador (Range)", () => {
  const size = 10 * 1024 * 1024;
  it("pedido aberto devolve no máximo 2 MB", () => {
    expect(parseRange("bytes=0-", size)).toEqual({ start: 0, end: MAX_RANGE_BYTES - 1 });
    expect(parseRange("bytes=100-199", size)).toEqual({ start: 100, end: 199 });
    expect(parseRange("bytes=-500", size)).toEqual({ start: size - 500, end: size - 1 });
    expect(parseRange(null, 1000)).toEqual({ start: 0, end: 999 });
  });
  it("fora do arquivo ou mal formado: nada", () => {
    expect(parseRange(`bytes=${size}-`, size)).toBeNull();
    expect(parseRange("bytes=5-2", size)).toBeNull();
    expect(parseRange("items=0-1", size)).toBeNull();
    expect(parseRange("bytes=-", size)).toBeNull();
  });
  it("lê só as partes que cobrem o trecho", () => {
    expect(partsForRange(VIDEO_PART_BYTES - 1, VIDEO_PART_BYTES + 1)).toEqual({
      first: 0,
      last: 1,
      offset: VIDEO_PART_BYTES - 1,
    });
  });
});
