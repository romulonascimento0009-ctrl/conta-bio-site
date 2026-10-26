"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton, type FormState } from "@/app/admin/_components/form";
import { deleteVideoAction } from "../../actions";

type VideoSummary = { id: string; name: string; durationMs: number; bytes: number };

export function VideoCard({
  clientId,
  video,
  posterUrl,
}: {
  clientId: string;
  video: VideoSummary;
  posterUrl?: string;
}) {
  const [state, action] = useActionState(
    deleteVideoAction.bind(null, clientId, video.id),
    {} as FormState,
  );
  return (
    <div className="rounded-md border border-border p-3">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded bg-neutral-900">
        {posterUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- miniatura de variante própria
          <img src={posterUrl} alt="" className="h-full w-full object-cover" />
        )}
        <span className="absolute bottom-2 left-2 rounded bg-black/70 px-2 py-0.5 text-xs font-bold text-white">
          ▶ {Math.round(video.durationMs / 1000)} s
        </span>
      </div>
      <p className="mt-2 truncate text-xs text-muted" title={video.name}>
        {video.name} · {(video.bytes / 1024 / 1024).toFixed(1)} MB
      </p>
      <p className="mt-1 font-mono text-xs break-all text-muted">id: {video.id}</p>
      <form action={action} className="mt-2">
        <SubmitButton variant="secondary" pendingText="Excluindo…">
          Excluir vídeo
        </SubmitButton>
        <FormMessage state={state} />
      </form>
    </div>
  );
}
