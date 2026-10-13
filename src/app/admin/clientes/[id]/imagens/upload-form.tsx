"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { uploadAssetAction } from "../../actions";

const MAX_SIDE = 2400;
const MAX_BYTES = 3.5 * 1024 * 1024;
const PASSTHROUGH_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

/** Reduz a foto no navegador (lado maior ≤ 2400 px) para caber no limite de envio. */
async function prepare(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // o servidor valida e devolve a mensagem de erro adequada
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= MAX_BYTES && PASSTHROUGH_TYPES.has(file.type)) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.9),
  );
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}

export function UploadForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const files = [...((form.elements.namedItem("files") as HTMLInputElement).files ?? [])];
    if (files.length === 0) return;
    setBusy(true);
    setLog([]);
    for (const original of files) {
      const fd = new FormData();
      fd.set("file", await prepare(original));
      try {
        const result = await uploadAssetAction(clientId, fd);
        setLog((l) => [...l, { ok: !!result.ok, text: result.message ?? original.name }]);
      } catch {
        setLog((l) => [...l, { ok: false, text: `${original.name}: falha no envio.` }]);
      }
    }
    form.reset();
    setBusy(false);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="files" className="text-sm font-medium">
          Arquivos
        </label>
        <input
          id="files"
          name="files"
          type="file"
          accept="image/*"
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
          {busy ? "Enviando…" : "Enviar"}
        </button>
      </div>
      {/* role="status" no contêiner: no próprio <ul> anularia a semântica de lista. */}
      <div role="status">
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
