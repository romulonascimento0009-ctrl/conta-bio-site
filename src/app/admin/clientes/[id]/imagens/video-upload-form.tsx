"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  finishVideoUploadAction,
  startVideoUploadAction,
  uploadVideoPartAction,
} from "../../actions";
import {
  MAX_VIDEO_BYTES as MAX_BYTES,
  MAX_VIDEO_MS,
  VIDEO_PART_BYTES as PART,
  VIDEO_TYPES,
  type VideoMime,
} from "@/media/video";

/** Os mesmos limites do servidor, conferidos antes de enviar. */
const MAX_SECONDS = MAX_VIDEO_MS / 1000;
const TYPES: Record<string, VideoMime> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

type Probe = { width: number; height: number; durationMs: number; poster: File };

/**
 * Abre o vídeo neste navegador (se não abrir aqui, não vai abrir no celular de quem visita),
 * lê duração e tamanho e tira a capa de um quadro do começo.
 */
function probe(file: File): Promise<Probe> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const fail = (msg: string) => {
      URL.revokeObjectURL(url);
      reject(new Error(msg));
    };
    const timer = setTimeout(() => fail("o vídeo não abriu a tempo."), 20_000);
    video.onerror = () => {
      clearTimeout(timer);
      fail(
        "este vídeo não abre no navegador. Envie em MP4 (H.264); no iPhone: Ajustes → Câmera → Formatos → Mais compatível.",
      );
    };
    // Com a duração conhecida: confere o limite e vai ao quadro da capa.
    const ready = () => {
      if (video.duration > MAX_SECONDS) {
        clearTimeout(timer);
        fail(`o vídeo tem ${Math.round(video.duration)} s; o máximo é ${MAX_SECONDS} s.`);
        return;
      }
      capture = true;
      video.currentTime = Math.min(1, video.duration / 3);
    };
    let capture = false;
    video.onloadedmetadata = () => {
      if (!video.videoWidth) {
        clearTimeout(timer);
        fail("não deu para ler o vídeo.");
        return;
      }
      if (Number.isFinite(video.duration)) return ready();
      // WebM gravado no navegador vem sem duração: pular para o fim faz o navegador medir.
      video.ondurationchange = () => {
        if (!Number.isFinite(video.duration)) return;
        video.ondurationchange = null;
        ready();
      };
      video.currentTime = 1e101;
    };
    video.onseeked = () => {
      if (!capture) return;
      clearTimeout(timer);
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url);
          if (!blob) return reject(new Error("não deu para tirar a capa do vídeo."));
          resolve({
            width: video.videoWidth,
            height: video.videoHeight,
            durationMs: Math.round(video.duration * 1000),
            poster: new File([blob], "capa.jpg", { type: "image/jpeg" }),
          });
        },
        "image/jpeg",
        0.85,
      );
    };
    video.src = url;
  });
}

export function VideoUploadForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);

  async function send(file: File): Promise<{ ok: boolean; text: string }> {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    const mime: VideoMime | undefined =
      TYPES[ext] ?? (file.type in VIDEO_TYPES ? (file.type as VideoMime) : undefined);
    if (!mime) return { ok: false, text: `${file.name}: use MP4, MOV ou WebM.` };
    if (file.size > MAX_BYTES)
      return { ok: false, text: `${file.name}: maior que 30 MB. Envie um trecho mais curto.` };
    let info: Probe;
    try {
      setProgress(`${file.name}: conferindo o vídeo…`);
      info = await probe(file);
    } catch (err) {
      return { ok: false, text: `${file.name}: ${(err as Error).message}` };
    }
    const start = await startVideoUploadAction(clientId, {
      name: file.name,
      mime,
      bytes: file.size,
      width: info.width,
      height: info.height,
      durationMs: info.durationMs,
    });
    if (!start.ok) return { ok: false, text: `${file.name}: ${start.message}` };
    const parts = Math.ceil(file.size / PART);
    for (let i = 0; i < parts; i++) {
      setProgress(`${file.name}: enviando ${Math.round((i / parts) * 100)}%`);
      const fd = new FormData();
      fd.set("part", file.slice(i * PART, (i + 1) * PART));
      const r = await uploadVideoPartAction(clientId, start.id, i, fd);
      if (!r.ok) return { ok: false, text: `${file.name}: ${r.message}` };
    }
    setProgress(`${file.name}: finalizando…`);
    const fd = new FormData();
    fd.set("poster", info.poster);
    const done = await finishVideoUploadAction(clientId, start.id, fd);
    return { ok: !!done.ok, text: done.message ?? file.name };
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const files = [...((form.elements.namedItem("videos") as HTMLInputElement).files ?? [])];
    if (files.length === 0) return;
    setBusy(true);
    setLog([]);
    for (const file of files) {
      let entry: { ok: boolean; text: string };
      try {
        entry = await send(file);
      } catch {
        entry = { ok: false, text: `${file.name}: falha no envio.` };
      }
      setLog((l) => [...l, entry]);
    }
    setProgress(null);
    form.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="videos" className="text-sm font-medium">
          Selecionar vídeos
        </label>
        <input
          id="videos"
          name="videos"
          type="file"
          accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm"
          multiple
          required
          className="text-sm"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {busy ? "Carregando…" : "Carregar vídeos"}
        </button>
      </div>
      <div role="status">
        {progress && <p className="text-sm text-muted">{progress}</p>}
        <ul className="text-sm">
          {log.map((entry, i) => (
            <li key={i} className={entry.ok ? "text-green-800" : "text-danger"}>
              {entry.text}
            </li>
          ))}
        </ul>
      </div>
    </form>
  );
}
