"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
} from "react";
import { PublishForm } from "@/app/admin/_components/publish-form";
import type { AssetInfo } from "@/data/assets";
import { validateBio, type BioDocument } from "@/sites/bio";
import {
  historyApply,
  historyInit,
  historyRedo,
  historyUndo,
  issueLocation,
  type EditorTab,
  type History,
  type Operation,
} from "@/sites/operations";
import { BioRenderer } from "@/sites/render/BioRenderer";
import { saveEditorAction } from "../../actions";
import { BlocksPanel, ContactPanel, LookPanel, ProfilePanel, TickerPanel } from "./panels";

export type EditorAsset = AssetInfo & { alt: string; name: string };

type Action = { type: "apply"; op: Operation; key?: string } | { type: "undo" } | { type: "redo" };

function reducer(h: History, a: Action): History {
  if (a.type === "undo") return historyUndo(h);
  if (a.type === "redo") return historyRedo(h);
  return historyApply(h, a.op, a.key);
}

/** Despacha uma operação; `key` junta a digitação seguida num só passo de desfazer. */
export type Dispatch = (op: Operation, key?: string) => void;

const TABS: { id: EditorTab; label: string }[] = [
  { id: "blocks", label: "Blocos" },
  { id: "profile", label: "Topo" },
  { id: "contact", label: "Contato" },
  { id: "ticker", label: "Faixa" },
  { id: "look", label: "Aparência" },
];

export function Editor({
  clientId,
  initial,
  assets,
  pending,
  publishedUrl,
}: {
  clientId: string;
  initial: BioDocument;
  assets: EditorAsset[];
  pending: boolean;
  publishedUrl?: string;
}) {
  const [history, send] = useReducer(reducer, initial, historyInit);
  const doc = history.present;
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(initial));
  const [tab, setTab] = useState<EditorTab>("blocks");
  const [selected, setSelected] = useState<string | undefined>(initial.blocks[0]?.id);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [saving, startSaving] = useTransition();
  const [saveMessage, setSaveMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const dispatch: Dispatch = useCallback((op, key) => send({ type: "apply", op, key }), []);
  const assetMap = useMemo(
    () => new Map<string, AssetInfo>(assets.map((a) => [a.id, a])),
    [assets],
  );
  const validation = useMemo(() => validateBio(doc), [doc]);
  const dirty = JSON.stringify(doc) !== savedJson;

  const save = useCallback(() => {
    if (!validation.ok || saving) return;
    setSaveMessage(null);
    startSaving(async () => {
      const result = await saveEditorAction(clientId, doc);
      setSaveMessage({ ok: result.ok, text: result.message });
      if (result.ok) setSavedJson(JSON.stringify(doc));
    });
  }, [clientId, doc, saving, validation.ok]);

  // Atalhos: Ctrl+Z / Ctrl+Y (ou Ctrl+Shift+Z) e Ctrl+S. Dentro de campos de texto, o desfazer
  // fica com o navegador.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        save();
        return;
      }
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        send({ type: "undo" });
      } else if (k === "y" || (k === "z" && e.shiftKey)) {
        e.preventDefault();
        send({ type: "redo" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  // Aviso ao sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Mantém o bloco selecionado visível na prévia.
  useEffect(() => {
    if (!selected || tab !== "blocks") return;
    previewRef.current
      ?.querySelector(`[data-block-id="${selected}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected, tab]);

  /** Clique na prévia: seleciona o que foi clicado em vez de seguir links ou acionar botões. */
  function onPreviewClick(e: MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-block-id], [data-edit]");
    if (!el) return;
    if (el.dataset.blockId) {
      setTab("blocks");
      setSelected(el.dataset.blockId);
    } else {
      setTab(el.dataset.edit as EditorTab);
    }
    setMobileView("edit");
  }

  const highlight =
    tab === "blocks" && selected ? `[data-block-id="${selected}"]` : `[data-edit="${tab}"]`;

  return (
    <div className="grid gap-4">
      {/* Barra de ações */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => send({ type: "undo" })}
          disabled={!history.past.length}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          title="Desfazer (Ctrl+Z)"
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={() => send({ type: "redo" })}
          disabled={!history.future.length}
          className="rounded-md border border-border bg-white px-3 py-1.5 text-sm disabled:opacity-50"
          title="Refazer (Ctrl+Y)"
        >
          Refazer
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || !validation.ok || saving}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
          title="Salvar rascunho (Ctrl+S)"
        >
          {saving ? "Salvando…" : dirty ? "Salvar rascunho" : "Rascunho salvo"}
        </button>
        <span
          role="status"
          className={`text-sm ${saveMessage?.ok === false ? "text-danger" : "text-muted"}`}
        >
          {saveMessage?.ok === false
            ? saveMessage.text
            : dirty
              ? "Alterações não salvas"
              : saveMessage?.text}
        </span>
        <div
          className="ml-auto flex gap-1 lg:hidden"
          role="group"
          aria-label="Alternar visualização"
        >
          {(["edit", "preview"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={mobileView === v}
              onClick={() => setMobileView(v)}
              className={`rounded-md border px-3 py-1.5 text-sm ${mobileView === v ? "border-accent bg-accent text-white" : "border-border bg-white"}`}
            >
              {v === "edit" ? "Editar" : "Prévia"}
            </button>
          ))}
        </div>
      </div>

      {!validation.ok && (
        <div role="alert" className="rounded-md border border-danger/40 bg-red-50 p-3 text-sm">
          <p className="font-semibold text-danger">Corrija antes de salvar:</p>
          <ul className="mt-1 grid gap-1">
            {validation.issues.slice(0, 6).map((issue, i) => {
              const loc = issueLocation(doc, issue.path);
              return (
                <li key={i}>
                  <button
                    type="button"
                    className="text-left underline"
                    onClick={() => {
                      setTab(loc.tab);
                      if (loc.blockId) setSelected(loc.blockId);
                      setMobileView("edit");
                    }}
                  >
                    {loc.label}: {issue.message}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[390px_1fr]">
        {/* Prévia de celular */}
        <section
          aria-label="Prévia"
          className={`${mobileView === "preview" ? "" : "hidden"} lg:block lg:sticky lg:top-16`}
        >
          <style>{`.editor-preview [data-block-id]:hover, .editor-preview [data-edit]:hover { outline: 2px dashed rgb(37 99 235 / .7); outline-offset: 2px; cursor: pointer; }
            .editor-preview ${highlight} { outline: 3px solid #2563eb !important; outline-offset: 3px; }`}</style>
          <div className="mx-auto h-[720px] max-h-[calc(100dvh-9rem)] w-full max-w-[390px] overflow-hidden rounded-[2rem] border-[6px] border-neutral-900 shadow-xl [transform:translateZ(0)]">
            <div
              ref={previewRef}
              className="editor-preview h-full overflow-y-auto"
              onClickCapture={onPreviewClick}
            >
              <BioRenderer doc={doc} assets={assetMap} embedded />
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted">
            Clique num bloco da prévia para editá-lo.
          </p>
        </section>

        {/* Painel */}
        <section
          aria-label="Edição"
          className={`${mobileView === "edit" ? "" : "hidden"} min-w-0 lg:block`}
        >
          <div
            role="tablist"
            aria-label="Partes do Bio Site"
            className="flex gap-1 overflow-x-auto border-b border-border"
          >
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls={`painel-${t.id}`}
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap ${tab === t.id ? "border-accent font-medium" : "border-transparent text-muted"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`painel-${tab}`} aria-labelledby={`tab-${tab}`} className="pt-4">
            {tab === "blocks" && (
              <BlocksPanel
                doc={doc}
                dispatch={dispatch}
                assets={assets}
                selected={selected}
                onSelect={setSelected}
              />
            )}
            {tab === "profile" && <ProfilePanel doc={doc} dispatch={dispatch} assets={assets} />}
            {tab === "contact" && <ContactPanel doc={doc} dispatch={dispatch} />}
            {tab === "ticker" && <TickerPanel doc={doc} dispatch={dispatch} />}
            {tab === "look" && <LookPanel doc={doc} dispatch={dispatch} />}
          </div>

          <div className="mt-8 grid gap-2">
            <h2 className="font-semibold">Publicar</h2>
            {publishedUrl && (
              <p className="text-sm text-muted">
                Endereço:{" "}
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noopener"
                  className="font-mono text-accent underline"
                >
                  {publishedUrl}
                </a>
              </p>
            )}
            <PublishForm
              clientId={clientId}
              pending={pending}
              blockedReason={dirty ? "Salve o rascunho antes de publicar." : undefined}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
