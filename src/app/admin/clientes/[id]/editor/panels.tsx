"use client";

import { useId, useState, type ReactNode } from "react";
import { inputClass } from "@/app/admin/_components/form";
import {
  instagramField,
  parseHours,
  phoneField,
  tiktokField,
  urlField,
  whatsappField,
} from "@/clients/briefing";
import {
  HERO_DEFAULTS,
  isStandardStyle,
  MAX_CATALOG_CATEGORIES,
  MAX_CATALOG_PRODUCTS,
  resolveLink,
  type BioDocument,
  type CatalogCategory,
  type Block,
  type BlockOf,
  type Hero,
  type LinkAction,
} from "@/sites/bio";
import { formatPrice, nextItemId, parsePrice } from "@/sites/catalog";
import { FONT_IDS, FONTS, isItalicFont } from "@/sites/fonts";
import { customIconStart, ICON_IDS, ICONS, type IconId, type SectionIconId } from "@/sites/icons";
import { NEW_BLOCK_TYPES, newBlock, type NewBlockType } from "@/sites/operations";
import { PATTERN_IDS, PATTERNS } from "@/sites/patterns";
import { looksLikeLink } from "@/sites/links";
import { mediaUrl } from "@/sites/render/media";
import { THEME_IDS, THEMES } from "@/sites/themes";
import type { Dispatch, EditorAsset } from "./editor";

/* ---------- Campos básicos ---------- */

function TextField({
  label,
  value,
  onChange,
  hint,
  multiline,
  type = "text",
  placeholder,
  maxLength,
  onBlur,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string) => void;
  onBlur?: () => void;
  hint?: string;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  // Campo obrigatório apagado sai do documento (vira pendência de validação); a caixa continua
  // controlada com texto vazio.
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-describedby={hint ? `${id}-h` : undefined}
          className={inputClass}
        />
      ) : (
        <input
          id={id}
          type={type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          maxLength={maxLength}
          aria-describedby={hint ? `${id}-h` : undefined}
          className={inputClass}
        />
      )}
      {hint && (
        <p id={`${id}-h`} className="text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * Texto livre convertido em lista (linhas ou vírgulas). Mantém o texto digitado localmente para
 * não "engolir" a linha em branco enquanto a pessoa digita; ressincroniza em desfazer/refazer.
 */
function ListField<T>({
  label,
  value,
  format,
  parse,
  onChange,
  hint,
  multiline = true,
}: {
  label: string;
  value: T;
  format: (v: T) => string;
  parse: (s: string) => T;
  onChange: (v: T) => void;
  hint?: string;
  multiline?: boolean;
}) {
  const [text, setText] = useState(() => format(value));
  const [prevValue, setPrevValue] = useState(value);
  // Ajuste durante a renderização (padrão recomendado pelo React em vez de useEffect).
  if (prevValue !== value) {
    setPrevValue(value);
    if (JSON.stringify(parse(text)) !== JSON.stringify(value)) setText(format(value));
  }
  return (
    <TextField
      label={label}
      value={text}
      hint={hint}
      multiline={multiline}
      onChange={(s) => {
        setText(s);
        onChange(parse(s));
      }}
    />
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4"
      />
      {label}
    </label>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={inputClass}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const id = useId();
  // Texto digitado (ex.: "#1b56") só vira cor quando completa; o seletor aplica na hora.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 shrink-0 rounded border border-border"
      />
      <input
        type="text"
        aria-label={`${label} (código)`}
        value={draft ?? value}
        maxLength={7}
        spellCheck={false}
        onChange={(e) => {
          const v = e.target.value.trim().toLowerCase();
          setDraft(v);
          if (/^#[0-9a-f]{6}$/.test(v)) onChange(v);
        }}
        onBlur={() => setDraft(null)}
        className="w-20 shrink-0 rounded border border-border bg-white px-2 py-1.5 font-mono text-xs"
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

function Range({
  label,
  value,
  min,
  max,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted tabular-nums">
          {value}
          {unit}
        </span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-accent)]"
      />
    </div>
  );
}

/** Cor própria do ícone de um bloco; desligada = cor padrão do ícone. */
function IconColor({
  icon,
  value,
  set,
}: {
  icon: IconId | SectionIconId;
  value: string | undefined;
  set: (patch: Record<string, unknown>, field: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Check
        label="Cor própria do ícone"
        checked={!!value}
        onChange={(on) =>
          set({ iconColor: on ? customIconStart(icon) : undefined }, "iconColor.toggle")
        }
      />
      {value && (
        <>
          <ColorField
            label="Cor do ícone"
            value={value}
            onChange={(v) => set({ iconColor: v }, "iconColor")}
          />
          <p className="text-xs text-muted">
            O desenho do ícone fica branco: cores muito claras são recusadas ao salvar.
          </p>
        </>
      )}
    </div>
  );
}

const ACTION_ICON: Record<LinkAction, IconId> = {
  instagram: "instagram",
  google_review: "google",
  whatsapp: "whatsapp",
  phone: "phone",
  maps: "maps",
  url: "link",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-md border border-border p-4">
      <legend className="px-1 font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

/** Escolha de uma imagem do cliente (ou nenhuma). */
function ImagePicker({
  label,
  assets,
  value,
  onChange,
}: {
  label: string;
  assets: EditorAsset[];
  value?: string;
  onChange: (assetId: string | undefined) => void;
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-medium">{label}</legend>
      {assets.length === 0 ? (
        <p className="text-sm text-muted">Envie imagens na aba Imagens para usá-las aqui.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!value}
            onClick={() => onChange(undefined)}
            className={`h-16 w-16 rounded border text-xs ${!value ? "border-accent ring-2 ring-accent" : "border-border"}`}
          >
            Nenhuma
          </button>
          {assets.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={value === a.id}
              aria-label={a.alt || a.name}
              onClick={() => onChange(a.id)}
              className={`h-16 w-16 overflow-hidden rounded border ${value === a.id ? "border-accent ring-2 ring-accent" : "border-border"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- miniatura própria */}
              <img
                src={mediaUrl(a.id, a.variants[0])}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}

/* ---------- Blocos ---------- */

const ACTION_LABEL: Record<LinkAction, string> = {
  instagram: "Instagram",
  google_review: "Avaliar no Google",
  whatsapp: "WhatsApp",
  phone: "Telefone",
  maps: "Localização",
  url: "Link personalizado",
};

const MISSING_HINT: Partial<Record<LinkAction, string>> = {
  instagram: "Preencha o Instagram na aba Contato.",
  google_review: "Preencha o link de avaliação do Google na aba Contato.",
  whatsapp: "Preencha o WhatsApp na aba Contato.",
  phone: "Preencha o telefone na aba Contato.",
  maps: "Preencha o endereço na aba Contato.",
};

function blockLabel(b: Block): string {
  const kind =
    b.type === "link"
      ? ACTION_LABEL[b.action]
      : b.type === "wifi"
        ? "Wi-Fi"
        : b.type === "hours"
          ? "Horários"
          : b.type === "gallery"
            ? "Galeria"
            : b.type === "pix"
              ? "Pix"
              : b.type === "catalog"
                ? "Catálogo"
                : "Texto";
  const title = "title" in b && b.title ? b.title : "";
  return title && title !== kind ? `${title} · ${kind}` : kind;
}

export function BlocksPanel({
  doc,
  dispatch,
  assets,
  selected,
  onSelect,
}: {
  doc: BioDocument;
  dispatch: Dispatch;
  assets: EditorAsset[];
  selected?: string;
  onSelect: (id: string | undefined) => void;
}) {
  const [newType, setNewType] = useState<NewBlockType>("link");
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const block = doc.blocks.find((b) => b.id === selected);

  function add() {
    const first = assets[0] && { assetId: assets[0].id, alt: assets[0].alt };
    const b = newBlock(doc, newType, first);
    if (!b) return;
    dispatch({ type: "block-add", block: b, afterId: selected });
    onSelect(b.id);
  }

  return (
    <div className="grid gap-6">
      <ol className="grid gap-1" aria-label="Blocos na ordem exibida">
        {doc.blocks.map((b, i) => (
          <li
            key={b.id}
            className={`flex flex-wrap items-center gap-1 rounded-md border px-2 py-1 ${b.id === selected ? "border-accent bg-blue-50" : "border-border bg-white"}`}
          >
            <button
              type="button"
              onClick={() => onSelect(b.id)}
              aria-current={b.id === selected ? "true" : undefined}
              className={`w-full min-w-0 truncate py-1 text-left text-sm sm:w-auto sm:flex-1 ${b.hidden ? "text-muted line-through" : ""}`}
            >
              {blockLabel(b)}
            </button>
            <button
              type="button"
              aria-label={`Mover ${blockLabel(b)} para cima`}
              disabled={i === 0}
              onClick={() => dispatch({ type: "block-move", id: b.id, delta: -1 })}
              className="rounded px-2 py-1 text-sm disabled:opacity-30"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label={`Mover ${blockLabel(b)} para baixo`}
              disabled={i === doc.blocks.length - 1}
              onClick={() => dispatch({ type: "block-move", id: b.id, delta: 1 })}
              className="rounded px-2 py-1 text-sm disabled:opacity-30"
            >
              ↓
            </button>
            <button
              type="button"
              aria-pressed={b.hidden}
              onClick={() => dispatch({ type: "block-toggle", id: b.id })}
              className="rounded px-2 py-1 text-xs"
            >
              {b.hidden ? "Mostrar" : "Ocultar"}
            </button>
            {confirmRemove === b.id ? (
              <button
                type="button"
                onClick={() => {
                  dispatch({ type: "block-remove", id: b.id });
                  setConfirmRemove(null);
                  if (selected === b.id) onSelect(undefined);
                }}
                className="rounded bg-danger px-2 py-1 text-xs text-white"
              >
                Confirmar remoção
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmRemove(b.id)}
                className="rounded px-2 py-1 text-xs text-danger"
              >
                Remover
              </button>
            )}
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-end gap-2">
        <Select
          label="Adicionar bloco"
          value={newType}
          options={Object.entries(NEW_BLOCK_TYPES).map(([value, label]) => ({
            value: value as NewBlockType,
            label,
          }))}
          onChange={setNewType}
        />
        <button
          type="button"
          onClick={add}
          disabled={
            ((newType === "gallery" || newType === "catalog") && !assets.length) ||
            (newType === "catalog" && doc.blocks.some((b) => b.type === "catalog"))
          }
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Adicionar
        </button>
        {newType === "catalog" && doc.blocks.some((b) => b.type === "catalog") && (
          <p className="text-xs text-muted">Este Bio Site já tem um catálogo.</p>
        )}
        {(newType === "gallery" || newType === "catalog") && !assets.length && (
          <p className="text-xs text-muted">Envie imagens antes.</p>
        )}
      </div>

      {block ? (
        <BlockEditor key={block.id} block={block} doc={doc} dispatch={dispatch} assets={assets} />
      ) : (
        <p className="text-sm text-muted">
          Selecione um bloco na lista ou na prévia para editá-lo.
        </p>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  doc,
  dispatch,
  assets,
}: {
  block: Block;
  doc: BioDocument;
  dispatch: Dispatch;
  assets: EditorAsset[];
}) {
  const set = (patch: Record<string, unknown>, field: string) =>
    dispatch({ type: "block-update", id: block.id, patch }, `block.${block.id}.${field}`);

  switch (block.type) {
    case "link":
      return <LinkEditor block={block} doc={doc} set={set} />;
    case "wifi":
      return (
        <Section title="Wi-Fi">
          <TextField
            label="Título"
            value={block.title}
            onChange={(v) => set({ title: v }, "title")}
            maxLength={40}
          />
          <TextField
            label="Nome da rede"
            value={block.network}
            onChange={(v) => set({ network: v }, "network")}
            maxLength={32}
          />
          <TextField
            label="Senha"
            value={block.password}
            hint="Aparece quando tocam no cartão do Wi-Fi. Vazia = rede aberta."
            onChange={(v) => set({ password: v, security: v ? "WPA" : "nopass" }, "password")}
            maxLength={63}
          />
          <IconColor icon="wifi" value={block.iconColor} set={set} />
        </Section>
      );
    case "pix":
      return (
        <Section title="Pix">
          <TextField
            label="Título"
            value={block.title}
            onChange={(v) => set({ title: v }, "title")}
            maxLength={40}
          />
          <TextField
            label="Chave Pix"
            value={block.key}
            hint="CPF, CNPJ, e-mail, chave aleatória ou celular com +55 (ex.: +5585999998888)."
            onChange={(v) => set({ key: v }, "key")}
            maxLength={77}
          />
          <TextField
            label="Nome do recebedor"
            value={block.name}
            hint="Como aparece no banco."
            onChange={(v) => set({ name: v }, "name")}
            maxLength={60}
          />
          <TextField
            label="Banco (opcional)"
            value={block.bank ?? ""}
            placeholder="Ex.: CloudWalk Meio de Pagamentos"
            hint="Aparece junto da chave, para quem paga conferir o destino."
            onChange={(v) => set({ bank: v }, "bank")}
            maxLength={40}
          />
          <TextField
            label="Cidade"
            value={block.city}
            onChange={(v) => set({ city: v }, "city")}
            maxLength={15}
          />
          <IconColor icon="pix" value={block.iconColor} set={set} />
        </Section>
      );
    case "hours":
      return (
        <Section title="Horários">
          <TextField
            label="Título"
            value={block.title}
            onChange={(v) => set({ title: v }, "title")}
            maxLength={40}
          />
          <ListField
            label="Um período por linha"
            hint="Ex.: Seg a sex | 8h – 18h"
            value={block.rows}
            format={(rows) => rows.map((r) => `${r.days} | ${r.time}`).join("\n")}
            parse={parseHours}
            onChange={(rows) => set({ rows }, "rows")}
          />
          <IconColor icon="clock" value={block.iconColor} set={set} />
        </Section>
      );
    case "gallery":
      return (
        <Section title="Galeria">
          <TextField
            label="Título"
            value={block.title}
            onChange={(v) => set({ title: v }, "title")}
            maxLength={40}
          />
          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Fotos (na ordem em que forem marcadas)</legend>
            <div className="flex flex-wrap gap-2">
              {assets.map((a) => {
                const on = block.images.some((img) => img.assetId === a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={on}
                    aria-label={a.alt || a.name}
                    onClick={() =>
                      set(
                        {
                          images: on
                            ? block.images.filter((img) => img.assetId !== a.id)
                            : [...block.images, { assetId: a.id, alt: a.alt }],
                        },
                        "images-" + a.id,
                      )
                    }
                    className={`h-16 w-16 overflow-hidden rounded border ${on ? "border-accent ring-2 ring-accent" : "border-border opacity-60"}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- miniatura própria */}
                    <img
                      src={mediaUrl(a.id, a.variants[0])}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted">A descrição de cada foto vem da aba Imagens.</p>
          </fieldset>
          <Select
            label="Como mostrar"
            value={block.display ?? "panel"}
            options={[
              { value: "panel", label: "Painel com as fotos" },
              { value: "card", label: "Cartão que abre as fotos (ex.: Meus trabalhos, Feedback)" },
            ]}
            onChange={(v) => set({ display: v === "panel" ? undefined : v }, "display")}
          />
          {block.display === "card" && (
            <>
              {!isStandardStyle(doc.theme.cardStyle) && (
                <p role="note" className="rounded bg-amber-50 p-2 text-sm text-amber-900">
                  O cartão só aparece nos estilos “Padrão” (Aparência). Nos outros, as fotos ficam
                  num painel.
                </p>
              )}
              <TextField
                label="Subtítulo do cartão (opcional)"
                value={block.subtitle ?? ""}
                placeholder="Ex.: Fotos com explicação"
                onChange={(v) => set({ subtitle: v }, "subtitle")}
                maxLength={90}
              />
              <Check
                label="Mostrar só o nome (sem ícone)"
                checked={!!block.hideIcon}
                onChange={(v) => set({ hideIcon: v || undefined }, "hideIcon")}
              />
              {!block.hideIcon && (
                <Check
                  label="Usar a primeira foto como ícone"
                  checked={!!block.iconPhoto}
                  onChange={(v) => set({ iconPhoto: v || undefined }, "iconPhoto")}
                />
              )}
              {!block.hideIcon && !block.iconPhoto && (
                <Select
                  label="Ícone do cartão"
                  value={block.icon ?? "photos"}
                  options={[
                    { value: "photos", label: "Fotos" },
                    ...ICON_IDS.map((i) => ({ value: i, label: ICONS[i].label })),
                  ]}
                  onChange={(v) => set({ icon: v === "photos" ? undefined : v }, "icon")}
                />
              )}
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium">Título e legenda de cada foto</legend>
                {block.images.map((img, i) => {
                  const a = assets.find((x) => x.id === img.assetId);
                  const setImage = (patch: Partial<typeof img>, field: string) =>
                    set(
                      {
                        images: block.images.map((x, j) =>
                          j === i
                            ? Object.fromEntries(
                                Object.entries({ ...x, ...patch }).filter(
                                  ([, v]) => v !== "" && v !== undefined,
                                ),
                              )
                            : x,
                        ),
                      },
                      `images.${i}.${field}`,
                    );
                  return (
                    <div key={`${img.assetId}-${i}`} className="flex gap-3">
                      {a && (
                        // eslint-disable-next-line @next/next/no-img-element -- miniatura própria
                        <img
                          src={mediaUrl(a.id, a.variants[0])}
                          alt=""
                          className="h-16 w-16 flex-none rounded object-cover"
                        />
                      )}
                      <div className="grid flex-1 gap-2">
                        <TextField
                          label={`Foto ${i + 1} — título`}
                          value={img.title ?? ""}
                          onChange={(v) => setImage({ title: v }, "title")}
                          maxLength={60}
                        />
                        <TextField
                          label={`Foto ${i + 1} — legenda`}
                          value={img.caption ?? ""}
                          multiline
                          onChange={(v) => setImage({ caption: v }, "caption")}
                          maxLength={240}
                        />
                      </div>
                    </div>
                  );
                })}
              </fieldset>
            </>
          )}
          <IconColor icon="photos" value={block.iconColor} set={set} />
        </Section>
      );
    case "catalog":
      return <CatalogEditor block={block} assets={assets} set={set} />;
    case "text":
      return (
        <Section title="Texto">
          <TextField
            label="Título (opcional)"
            value={block.title ?? ""}
            onChange={(v) => set({ title: v }, "title")}
            maxLength={60}
          />
          <TextField
            label="Texto"
            multiline
            value={block.body}
            onChange={(v) => set({ body: v }, "body")}
            maxLength={1000}
            hint="Deixe uma linha em branco para separar parágrafos."
          />
        </Section>
      );
  }
}

/* ---------- Catálogo ---------- */

/** Remove chaves vazias (etiqueta apagada, sem foto de capa, sem preço). */
function clean<T extends object>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== ""),
  ) as T;
}

function moved<T>(list: T[], i: number, delta: -1 | 1): T[] {
  const j = i + delta;
  if (j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Preço digitado ("29,90"); confere ao sair do campo. Vazio = sem preço na tela nem total. */
function PriceField({
  label,
  cents,
  onChange,
}: {
  label: string;
  cents: number | undefined;
  onChange: (cents: number | undefined) => void;
}) {
  const [text, setText] = useState(formatPrice(cents));
  const [error, setError] = useState(false);
  return (
    <div className="grid gap-1">
      <TextField
        label={label}
        value={text}
        placeholder="Ex.: 29,90 (opcional)"
        onChange={setText}
        onBlur={() => {
          const v = parsePrice(text);
          setError(v === null);
          if (v === null) return;
          onChange(v);
          setText(formatPrice(v));
        }}
        maxLength={14}
      />
      {error && (
        <p role="alert" className="text-xs text-danger">
          Preço inválido. Use só números, ex.: 29,90.
        </p>
      )}
    </div>
  );
}

function CatalogEditor({
  block,
  assets,
  set,
}: {
  block: BlockOf<"catalog">;
  assets: EditorAsset[];
  set: (patch: Record<string, unknown>, field: string) => void;
}) {
  const cats = block.categories;
  const setCats = (categories: CatalogCategory[], field: string) =>
    set({ categories }, `categories.${field}`);
  const updCat = (i: number, patch: Partial<CatalogCategory>, field: string) =>
    setCats(
      cats.map((c, j) => (j === i ? clean({ ...c, ...patch }) : c)),
      `${i}.${field}`,
    );
  const ref = (id: string | undefined) => {
    const a = id ? assets.find((x) => x.id === id) : undefined;
    return a ? { assetId: a.id, alt: a.alt } : undefined;
  };
  const first = assets[0] && { assetId: assets[0].id, alt: assets[0].alt };

  return (
    <Section title="Catálogo de produtos">
      <TextField
        label="Título da vitrine"
        value={block.title}
        onChange={(v) => set({ title: v }, "title")}
        maxLength={40}
      />
      <TextField
        label="Frase de ajuda (opcional)"
        value={block.subtitle ?? ""}
        onChange={(v) => set({ subtitle: v || undefined }, "subtitle")}
        maxLength={120}
      />
      <p className="text-xs text-muted">
        Quem visita escolhe produtos de várias categorias e envia o pedido inteiro pelo WhatsApp
        (Contato). Até {MAX_CATALOG_CATEGORIES} categorias com {MAX_CATALOG_PRODUCTS} produtos cada.
      </p>
      {cats.map((c, i) => (
        <details key={c.id} open={i === 0} className="rounded-md border border-border p-3">
          <summary className="cursor-pointer text-sm font-semibold">
            {c.name} · {c.products.length} {c.products.length === 1 ? "produto" : "produtos"}
          </summary>
          <div className="mt-3 grid gap-3">
            <TextField
              label="Nome da categoria"
              value={c.name}
              onChange={(v) => updCat(i, { name: v }, "name")}
              maxLength={40}
            />
            <TextField
              label="Etiqueta (opcional)"
              value={c.tag ?? ""}
              placeholder="Ex.: Mais vendidos, Novidade"
              onChange={(v) => updCat(i, { tag: v }, "tag")}
              maxLength={20}
            />
            <ImagePicker
              label="Foto da categoria (Nenhuma = foto do 1º produto)"
              assets={assets}
              value={c.cover?.assetId}
              onChange={(id) => updCat(i, { cover: ref(id) }, "cover")}
            />
            <div className="flex flex-wrap gap-2 text-sm">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => setCats(moved(cats, i, -1), "order")}
                className="rounded border border-border px-2 py-1 disabled:opacity-30"
              >
                ↑ Subir categoria
              </button>
              <button
                type="button"
                disabled={i === cats.length - 1}
                onClick={() => setCats(moved(cats, i, 1), "order")}
                className="rounded border border-border px-2 py-1 disabled:opacity-30"
              >
                ↓ Descer
              </button>
              <button
                type="button"
                disabled={cats.length === 1}
                onClick={() =>
                  setCats(
                    cats.filter((_, j) => j !== i),
                    "remove",
                  )
                }
                className="rounded px-2 py-1 text-danger disabled:opacity-30"
              >
                Remover categoria
              </button>
            </div>

            <ol className="grid gap-3">
              {c.products.map((p, k) => {
                const updProd = (patch: Partial<(typeof c.products)[number]>, field: string) =>
                  updCat(
                    i,
                    {
                      products: c.products.map((x, m) => (m === k ? clean({ ...x, ...patch }) : x)),
                    },
                    `products.${k}.${field}`,
                  );
                return (
                  <li key={p.id} className="grid gap-2 rounded-md bg-slate-50 p-2">
                    <ImagePicker
                      label={`Produto ${k + 1} — foto`}
                      assets={assets}
                      value={p.image.assetId}
                      onChange={(id) => {
                        const img = ref(id);
                        if (img) updProd({ image: img }, "image");
                      }}
                    />
                    <TextField
                      label={`Produto ${k + 1} — nome`}
                      value={p.name}
                      onChange={(v) => updProd({ name: v }, "name")}
                      maxLength={60}
                    />
                    <PriceField
                      label={`Produto ${k + 1} — preço (R$)`}
                      cents={p.priceCents}
                      onChange={(v) => updProd({ priceCents: v }, "price")}
                    />
                    <div className="flex flex-wrap gap-2 text-sm">
                      <button
                        type="button"
                        disabled={k === 0}
                        aria-label={`Subir ${p.name}`}
                        onClick={() => updCat(i, { products: moved(c.products, k, -1) }, "order")}
                        className="rounded border border-border px-2 py-1 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={k === c.products.length - 1}
                        aria-label={`Descer ${p.name}`}
                        onClick={() => updCat(i, { products: moved(c.products, k, 1) }, "order")}
                        className="rounded border border-border px-2 py-1 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={c.products.length === 1}
                        onClick={() =>
                          updCat(i, { products: c.products.filter((_, m) => m !== k) }, "remove")
                        }
                        className="rounded px-2 py-1 text-danger disabled:opacity-30"
                      >
                        Remover produto
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <button
              type="button"
              disabled={!first || c.products.length >= MAX_CATALOG_PRODUCTS}
              onClick={() =>
                first &&
                updCat(
                  i,
                  {
                    products: [
                      ...c.products,
                      {
                        id: nextItemId(
                          c.products.map((x) => x.id),
                          "p",
                        ),
                        name: "Produto",
                        image: first,
                      },
                    ],
                  },
                  "add",
                )
              }
              className="justify-self-start rounded-md border border-border bg-white px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              + Adicionar produto ({c.products.length}/{MAX_CATALOG_PRODUCTS})
            </button>
          </div>
        </details>
      ))}
      <button
        type="button"
        disabled={!first || cats.length >= MAX_CATALOG_CATEGORIES}
        onClick={() =>
          first &&
          setCats(
            [
              ...cats,
              {
                id: nextItemId(
                  cats.map((x) => x.id),
                  "c",
                ),
                name: "Nova categoria",
                products: [{ id: "p1", name: "Produto", image: first }],
              },
            ],
            "add",
          )
        }
        className="justify-self-start rounded-md border border-border bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        + Adicionar categoria
      </button>
    </Section>
  );
}

function LinkEditor({
  block,
  doc,
  set,
}: {
  block: BlockOf<"link">;
  doc: BioDocument;
  set: (patch: Record<string, unknown>, field: string) => void;
}) {
  const resolved = resolveLink(block, doc.contact);
  const std = isStandardStyle(doc.theme.cardStyle);
  return (
    <Section title="Cartão">
      {!resolved && (
        <p role="note" className="rounded bg-amber-50 p-2 text-sm text-amber-900">
          Este cartão não aparece no Bio Site. {MISSING_HINT[block.action] ?? "Informe o link."}
        </p>
      )}
      <Select
        label="Tipo"
        value={block.action}
        options={Object.entries(ACTION_LABEL).map(([value, label]) => ({
          value: value as LinkAction,
          label,
        }))}
        onChange={(action) =>
          set(
            action === "url"
              ? { action, url: block.url ?? "https://", icon: block.icon ?? "link" }
              : { action, url: undefined, icon: undefined },
            "action",
          )
        }
      />
      <TextField
        label="Título"
        value={block.title}
        onChange={(v) => set({ title: v }, "title")}
        maxLength={60}
      />
      <TextField
        label="Subtítulo"
        value={block.subtitle ?? ""}
        placeholder={resolved?.subtitle ? `Automático: ${resolved.subtitle}` : "Opcional"}
        hint="Vazio = texto automático (ex.: endereço)."
        onChange={(v) => set({ subtitle: v }, "subtitle")}
        maxLength={90}
      />
      {looksLikeLink(block.subtitle ?? "") && (
        <p role="note" className="rounded bg-amber-50 p-2 text-sm text-amber-900">
          Links não aparecem escritos no cartão; ali fica o texto automático. Quem tocar vai para o
          link informado em Contato.
        </p>
      )}
      <TextField
        label="Selo (opcional)"
        value={block.badge ?? ""}
        placeholder="Ex.: Responde rápido"
        onChange={(v) => set({ badge: v }, "badge")}
        maxLength={30}
      />
      <Check
        label="Mostrar só o nome (sem ícone)"
        checked={!!block.hideIcon}
        onChange={(v) => set({ hideIcon: v || undefined }, "hideIcon")}
      />
      {!std && (
        <Select
          label="Destaque"
          value={!block.featured ? "none" : (block.featureStyle ?? "color")}
          options={[
            { value: "none", label: "Sem destaque" },
            { value: "neon", label: "Neon (vidro preto com luz na cor do ícone)" },
            { value: "color", label: "Cheio na cor do ícone" },
          ]}
          onChange={(v) =>
            set(
              v === "none"
                ? { featured: undefined, featureStyle: undefined }
                : { featured: true, featureStyle: v === "neon" ? "neon" : undefined },
              "featured",
            )
          }
        />
      )}
      <TextField
        label="Etiqueta no canto (opcional)"
        value={block.tag ?? ""}
        placeholder="Ex.: Novo"
        onChange={(v) => set({ tag: v }, "tag")}
        maxLength={14}
      />
      {!std && (
        <TextField
          label="Valor à direita (opcional)"
          value={block.value ?? ""}
          placeholder="Ex.: Grátis"
          hint="Aparece no lugar da seta (não aparece nos estilos “Padrão”)."
          onChange={(v) => set({ value: v }, "value")}
          maxLength={12}
        />
      )}
      {block.action === "url" && (
        <>
          <TextField
            label="Link"
            type="url"
            value={block.url ?? ""}
            onChange={(v) => set({ url: v }, "url")}
            placeholder="https://"
          />
          <Select
            label="Ícone"
            value={block.icon ?? "link"}
            options={ICON_IDS.map((i) => ({ value: i, label: ICONS[i].label }))}
            onChange={(icon) => set({ icon }, "icon")}
          />
        </>
      )}
      {std ? (
        <p className="text-xs text-muted">
          No visual padrão todos os cartões seguem o estilo da Aparência; a cor do ícone (abaixo)
          tinge o cartão.
        </p>
      ) : (
        <Select
          label="Cor do cartão"
          value={block.colors && block.variant === "solid" ? "custom" : block.variant}
          options={[
            { value: "solid", label: "Cor do tema" },
            { value: "custom", label: "Cor própria" },
            { value: "light", label: "Claro" },
          ]}
          onChange={(v) =>
            set(
              v === "custom"
                ? {
                    variant: "solid",
                    colors: block.colors ?? {
                      top: doc.theme.colors.cardTop,
                      bottom: doc.theme.colors.cardBottom,
                    },
                  }
                : { variant: v, colors: undefined },
              "variant",
            )
          }
        />
      )}
      {!std && block.colors && block.variant === "solid" && (
        <div className="grid gap-2">
          <ColorField
            label="Topo do degradê"
            value={block.colors.top}
            onChange={(top) => set({ colors: { ...block.colors!, top } }, "colors.top")}
          />
          <ColorField
            label="Base do degradê"
            value={block.colors.bottom}
            onChange={(bottom) => set({ colors: { ...block.colors!, bottom } }, "colors.bottom")}
          />
          <p className="text-xs text-muted">
            O texto do cartão é branco: cores muito claras são recusadas ao salvar.
          </p>
        </div>
      )}
      <IconColor
        icon={block.action === "url" ? (block.icon ?? "link") : ACTION_ICON[block.action]}
        value={block.iconColor}
        set={set}
      />
    </Section>
  );
}

/* ---------- Topo ---------- */

export function ProfilePanel({
  doc,
  dispatch,
  assets,
}: {
  doc: BioDocument;
  dispatch: Dispatch;
  assets: EditorAsset[];
}) {
  const p = doc.profile;
  const set = (patch: Partial<BioDocument["profile"]>, field: string) =>
    dispatch({ type: "profile", patch }, `profile.${field}`);
  const ref = (id: string | undefined) => {
    const a = assets.find((x) => x.id === id);
    return a ? { assetId: a.id, alt: a.alt } : undefined;
  };
  return (
    <div className="grid gap-4">
      <Section title="Identidade">
        <TextField
          label="Nome"
          value={p.name}
          onChange={(v) => set({ name: v }, "name")}
          maxLength={60}
        />
        <TextField
          label="Slogan"
          value={p.tagline ?? ""}
          onChange={(v) => set({ tagline: v }, "tagline")}
          maxLength={120}
        />
        <ListField
          label="Categorias"
          multiline={false}
          hint="Separadas por vírgula (até 6, com até 24 letras cada)."
          value={p.categories}
          format={(c) => c.join(", ")}
          parse={(s) =>
            s
              .split(",")
              .map((x) => x.trim().toUpperCase())
              .filter(Boolean)
          }
          onChange={(categories) => set({ categories }, "categories")}
        />
        <TextField
          label="Cidade"
          value={p.city ?? ""}
          onChange={(v) => set({ city: v }, "city")}
          maxLength={40}
          placeholder="Ex.: Campinas/SP"
        />
        <Check
          label="Mostrar botão Compartilhar"
          checked={p.showShare}
          onChange={(v) => set({ showShare: v }, "share")}
        />
      </Section>
      <Section title="Imagens">
        <ImagePicker
          label="Logo"
          assets={assets}
          value={p.logo?.assetId}
          onChange={(id) => set({ logo: ref(id) }, "logo")}
        />
        {p.logo && (
          <Select
            label="Moldura do logo"
            value={p.logoFrame ?? "circle"}
            options={[
              { value: "circle", label: "Círculo" },
              { value: "none", label: "Sem moldura, maior (logo sem fundo, ex.: escudo)" },
            ]}
            onChange={(v) => set({ logoFrame: v === "circle" ? undefined : v }, "logoFrame")}
          />
        )}
        {p.logo && (
          <Check
            label="O logo já tem o nome e o slogan (esconde os textos repetidos)"
            checked={!!p.logoHasName}
            onChange={(v) => set({ logoHasName: v || undefined }, "logoHasName")}
          />
        )}
        <ImagePicker
          label="Foto da fachada (ou de fundo)"
          assets={assets}
          value={p.background?.assetId}
          onChange={(id) => set({ background: ref(id) }, "background")}
        />
        <ImagePicker
          label="Fundo da página (conforme o ramo)"
          assets={assets}
          value={p.pageBackground?.assetId}
          onChange={(id) => set({ pageBackground: ref(id) }, "pageBackground")}
        />
        <p className="-mt-2 text-xs text-muted">
          Fica parado enquanto a página rola (ex.: céu com arco-íris para parque infantil; preto com
          dourado para barbearia). Aparece nos estilos “Padrão” da Aparência.
        </p>
        {p.background && (
          <Select
            label="Como mostrar a foto"
            value={p.backgroundMode ?? "blur"}
            options={[
              { value: "blur", label: "Desfocada, atrás de tudo" },
              { value: "cover", label: "Nítida no alto (fachada)" },
            ]}
            onChange={(v) =>
              set({ backgroundMode: v === "blur" ? undefined : v }, "backgroundMode")
            }
          />
        )}
      </Section>
      <HeroColors doc={doc} dispatch={dispatch} />
      <Section title="Busca e compartilhamento">
        <TextField
          label="Título da página"
          value={doc.meta.title}
          onChange={(v) => dispatch({ type: "meta", patch: { title: v } }, "meta.title")}
          maxLength={70}
        />
        <TextField
          label="Descrição"
          value={doc.meta.description}
          onChange={(v) =>
            dispatch({ type: "meta", patch: { description: v } }, "meta.description")
          }
          maxLength={160}
          multiline
        />
      </Section>
    </div>
  );
}

/* ---------- Contato ---------- */

/** Normaliza como o briefing (ex.: link do Instagram → perfil) quando o valor já é válido. */
function normalize(
  schema: { safeParse: (v: string) => { success: boolean; data?: string } },
  v: string,
): string {
  const r = schema.safeParse(v);
  return r.success && r.data !== undefined ? r.data : v;
}

export function ContactPanel({ doc, dispatch }: { doc: BioDocument; dispatch: Dispatch }) {
  const c = doc.contact;
  const set = (field: keyof BioDocument["contact"], value: unknown) =>
    dispatch(
      { type: "contact", patch: { [field]: value === "" ? undefined : value } },
      `contact.${field}`,
    );
  const num = (v: string) => (v === "" ? undefined : Number(v.replace(",", ".")));
  return (
    <div className="grid gap-4">
      <Section title="Instagram e Google">
        <TextField
          label="Instagram"
          value={c.instagram ?? ""}
          hint="Cole o link do perfil ou escreva o @perfil"
          onChange={(v) => set("instagram", normalize(instagramField, v))}
        />
        <TextField
          label="Link para avaliar no Google"
          value={c.googleReviewUrl ?? ""}
          hint="Perfil da Empresa no Google → Pedir avaliações → copiar link"
          onChange={(v) => set("googleReviewUrl", v)}
          onBlur={() => set("googleReviewUrl", normalize(urlField, c.googleReviewUrl ?? ""))}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Nota"
            value={c.googleRating?.toString() ?? ""}
            placeholder="4,8"
            onChange={(v) => set("googleRating", num(v))}
          />
          <TextField
            label="Avaliações"
            value={c.googleReviewCount?.toString() ?? ""}
            placeholder="312"
            onChange={(v) => set("googleReviewCount", num(v))}
          />
        </div>
      </Section>
      <Section title="WhatsApp e telefone">
        <TextField
          label="WhatsApp"
          type="tel"
          value={c.whatsapp ?? ""}
          hint="Cole o link (wa.me/…) ou escreva o número com DDD"
          // Enquanto digita, só os dígitos (o 55 entraria cedo demais); link colado e saída do campo
          // passam pela leitura completa.
          onChange={(v) =>
            set("whatsapp", /[a-z]/i.test(v) ? normalize(whatsappField, v) : v.replace(/D/g, ""))
          }
          onBlur={() => set("whatsapp", normalize(whatsappField, c.whatsapp ?? ""))}
        />
        <TextField
          label="Mensagem inicial do WhatsApp"
          value={c.whatsappMessage ?? ""}
          placeholder="Olá! Vim pelo Bio Site."
          onChange={(v) => set("whatsappMessage", v)}
          maxLength={200}
        />
        <Check
          label="Botão flutuante do WhatsApp"
          checked={doc.floatingWhatsapp}
          onChange={(v) => dispatch({ type: "floating-whatsapp", enabled: v })}
        />
        <TextField
          label="Telefone"
          type="tel"
          value={c.phone ?? ""}
          onChange={(v) => set("phone", normalize(phoneField, v))}
        />
        <TextField
          label="E-mail"
          type="email"
          value={c.email ?? ""}
          onChange={(v) => set("email", v)}
        />
      </Section>
      <Section title="Localização">
        <TextField
          label="Endereço"
          value={c.address ?? ""}
          onChange={(v) => set("address", v)}
          maxLength={160}
        />
        <TextField
          label="Link do mapa (opcional)"
          value={c.mapsUrl ?? ""}
          onChange={(v) => set("mapsUrl", v)}
          onBlur={() => set("mapsUrl", normalize(urlField, c.mapsUrl ?? ""))}
        />
      </Section>
      <Section title="Outras redes">
        <TextField
          label="Facebook (link)"
          value={c.facebookUrl ?? ""}
          onChange={(v) => set("facebookUrl", v)}
          onBlur={() => set("facebookUrl", normalize(urlField, c.facebookUrl ?? ""))}
        />
        <TextField
          label="TikTok"
          value={c.tiktok ?? ""}
          hint="Cole o link do perfil ou escreva o @perfil"
          onChange={(v) => set("tiktok", normalize(tiktokField, v))}
        />
        <TextField
          label="YouTube (link)"
          value={c.youtubeUrl ?? ""}
          onChange={(v) => set("youtubeUrl", v)}
          onBlur={() => set("youtubeUrl", normalize(urlField, c.youtubeUrl ?? ""))}
        />
      </Section>
    </div>
  );
}

/* ---------- Faixa ---------- */

export function TickerPanel({ doc, dispatch }: { doc: BioDocument; dispatch: Dispatch }) {
  const t = doc.ticker;
  const colors = t.colors ?? doc.tickerTheme;
  return (
    <Section title="Faixa de aviso">
      <Check
        label="Mostrar a faixa"
        checked={t.enabled}
        onChange={(enabled) => dispatch({ type: "ticker", patch: { enabled } })}
      />
      <ListField
        label="Frases (uma por linha)"
        hint="Até 60 caracteres cada."
        value={t.items}
        format={(items) => items.join("\n")}
        parse={(s) =>
          s
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean)
        }
        onChange={(items) => dispatch({ type: "ticker", patch: { items } }, "ticker.items")}
      />
      <Check
        label="Usar cores próprias (senão, as do tema)"
        checked={!!t.colors}
        onChange={(on) =>
          dispatch({ type: "ticker", patch: { colors: on ? { ...doc.tickerTheme } : undefined } })
        }
      />
      {t.colors && (
        <div className="flex flex-wrap gap-4">
          <ColorField
            label="Fundo"
            value={colors.bg}
            onChange={(bg) =>
              dispatch({ type: "ticker", patch: { colors: { ...colors, bg } } }, "ticker.bg")
            }
          />
          <ColorField
            label="Letra"
            value={colors.fg}
            onChange={(fg) =>
              dispatch({ type: "ticker", patch: { colors: { ...colors, fg } } }, "ticker.fg")
            }
          />
        </div>
      )}
    </Section>
  );
}

/** Cores e efeitos do topo: fundo, escurecimento, desfoque, texto e logo. */
function HeroColors({ doc, dispatch }: { doc: BioDocument; dispatch: Dispatch }) {
  const c = doc.theme.colors;
  const hero = doc.theme.hero ?? HERO_DEFAULTS;
  const color = (k: ThemeColor) => (v: string) =>
    dispatch({ type: "theme", patch: { colors: { [k]: v } } }, `theme.${k}`);
  const setHero = (patch: Partial<Hero>, key: string) =>
    dispatch({ type: "hero", patch }, `hero.${key}`);

  return (
    <Section title="Cores do topo">
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Fundo</h3>
        {doc.profile.background ? (
          <p className="text-xs text-muted">
            Com foto de fundo, estas cores ficam por trás da foto. Use o escurecimento abaixo para o
            texto ficar fácil de ler.
          </p>
        ) : (
          <p className="text-xs text-muted">
            Sem foto, o fundo é a mistura desfocada destas cores.
          </p>
        )}
        <div className="grid gap-2 xl:grid-cols-2">
          <ColorField label="Cor 1" value={c.glow1} onChange={color("glow1")} />
          <ColorField label="Cor 2" value={c.glow2} onChange={color("glow2")} />
          <ColorField label="Cor 3" value={c.glow3} onChange={color("glow3")} />
          <ColorField label="Cor de base" value={c.base} onChange={color("base")} />
        </div>
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "theme",
              patch: { colors: { glow1: c.base, glow2: c.base, glow3: c.base } },
            })
          }
          className="justify-self-start rounded-md border border-border bg-white px-3 py-1.5 text-sm"
        >
          Usar só a cor de base no fundo
        </button>
      </div>
      <div className="grid gap-3">
        <h3 className="text-sm font-semibold">Escurecimento e desfoque</h3>
        <ColorField
          label="Cor do escurecimento"
          value={hero.veil}
          onChange={(veil) => setHero({ veil }, "veil")}
        />
        <Range
          label="Intensidade do escurecimento"
          value={hero.veilOpacity}
          min={0}
          max={90}
          unit="%"
          onChange={(veilOpacity) => setHero({ veilOpacity }, "veilOpacity")}
        />
        <Range
          label="Desfoque do fundo"
          value={hero.blur}
          min={0}
          max={40}
          unit=" px"
          onChange={(blur) => setHero({ blur }, "blur")}
        />
      </div>
      <div className="grid gap-2">
        <h3 className="text-sm font-semibold">Texto e logo</h3>
        <div className="grid gap-2 xl:grid-cols-2">
          <ColorField
            label="Nome e frase"
            value={hero.text}
            onChange={(text) => setHero({ text }, "text")}
          />
          <ColorField label="Categorias" value={c.accent} onChange={color("accent")} />
          <ColorField
            label="Borda do logo"
            value={hero.logoBorder}
            onChange={(logoBorder) => setHero({ logoBorder }, "logoBorder")}
          />
          {!doc.profile.logo && (
            <>
              <ColorField label="Fundo do monograma" value={c.logoBg} onChange={color("logoBg")} />
              <ColorField label="Letras do monograma" value={c.logoFg} onChange={color("logoFg")} />
            </>
          )}
        </div>
      </div>
      {doc.theme.hero && (
        <button
          type="button"
          onClick={() => dispatch({ type: "hero-reset" })}
          className="justify-self-start rounded-md border border-border bg-white px-3 py-1.5 text-sm"
        >
          Voltar escurecimento, desfoque, texto e borda ao padrão
        </button>
      )}
    </Section>
  );
}

/* ---------- Aparência ---------- */

type ThemeColor = keyof BioDocument["theme"]["colors"];

/** Cores do tema agrupadas pela parte do Bio Site onde aparecem. */
const COLOR_GROUPS: { title: string; colors: [ThemeColor, string][] }[] = [
  {
    title: "Cartões",
    colors: [
      ["cardTop", "Topo do degradê"],
      ["cardBottom", "Base do degradê"],
    ],
  },
  {
    title: "Topo",
    colors: [
      ["glow1", "Fundo desfocado: cor 1"],
      ["glow2", "Fundo desfocado: cor 2"],
      ["glow3", "Fundo desfocado: cor 3"],
      ["accent", "Categorias"],
      ["logoBg", "Fundo do monograma"],
      ["logoFg", "Letras do monograma"],
    ],
  },
  {
    title: "Página e painéis",
    colors: [
      ["base", "Fundo da página"],
      ["ink", "Texto dos painéis"],
      ["inkMuted", "Texto secundário"],
    ],
  },
];

const WHATSAPP_GREEN = "#25d366";

/** Detalhes do visual padrão por cliente: borda neon, categorias, nome, slogan e reflexo. */
function StandardDetails({ doc, dispatch }: { doc: BioDocument; dispatch: Dispatch }) {
  const th = doc.theme;
  const theme = (patch: Partial<BioDocument["theme"]>, field?: string) =>
    dispatch({ type: "theme", patch }, field);
  return (
    <div className="grid gap-3 rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold">Detalhes do visual padrão</h3>
      {th.cardStyle === "deep" && (
        <ColorField
          label="Cor do texto dos cartões"
          value={th.cardText ?? "#ffffff"}
          onChange={(v) => theme({ cardText: v }, "theme.cardText")}
        />
      )}
      {th.cardStyle !== "satin" && (
        <Check
          label="Fundo da página claro (nome e slogan na cor do texto dos painéis)"
          checked={!!th.lightPage}
          onChange={(on) => theme({ lightPage: on || undefined })}
        />
      )}
      {(th.cardStyle === "neon" || th.cardStyle === "satin" || th.cardStyle === "deep") && (
        <>
          <Check
            label={
              th.cardStyle === "neon"
                ? "Borda neon nas cores do cliente"
                : "Borda nas cores do cliente"
            }
            checked={!!th.neonEdges}
            onChange={(on) =>
              theme({ neonEdges: on ? { start: "#1e6fff", end: "#f5c400" } : undefined })
            }
          />
          {th.neonEdges && (
            <div className="grid gap-2 xl:grid-cols-2">
              <ColorField
                label="Borda: início"
                value={th.neonEdges.start}
                onChange={(start) =>
                  theme({ neonEdges: { ...th.neonEdges!, start } }, "theme.neonEdges.start")
                }
              />
              <ColorField
                label="Borda: fim"
                value={th.neonEdges.end}
                onChange={(end) =>
                  theme({ neonEdges: { ...th.neonEdges!, end } }, "theme.neonEdges.end")
                }
              />
            </div>
          )}
        </>
      )}
      <Check
        label="Categorias em cor própria"
        checked={!!th.chips}
        onChange={(on) => theme({ chips: on ? { bg: "#f5c400", fg: th.colors.ink } : undefined })}
      />
      {th.chips && (
        <div className="grid gap-2 xl:grid-cols-2">
          <ColorField
            label="Categorias: fundo"
            value={th.chips.bg}
            onChange={(bg) => theme({ chips: { ...th.chips!, bg } }, "theme.chips.bg")}
          />
          <ColorField
            label="Categorias: letra"
            value={th.chips.fg}
            onChange={(fg) => theme({ chips: { ...th.chips!, fg } }, "theme.chips.fg")}
          />
        </div>
      )}
      <Check
        label="Última palavra do nome em destaque"
        checked={!!th.nameAccent}
        onChange={(on) => theme({ nameAccent: on ? "#f5c400" : undefined })}
      />
      {th.nameAccent && (
        <ColorField
          label="Cor do destaque do nome"
          value={th.nameAccent}
          onChange={(nameAccent) => theme({ nameAccent }, "theme.nameAccent")}
        />
      )}
      <Check
        label="Slogan em faixa escura (fundos escuros)"
        checked={!!th.taglineDark}
        onChange={(on) => theme({ taglineDark: on || undefined })}
      />
      <Check
        label="Reflexo de luz passando no fundo"
        checked={!!th.shine}
        onChange={(on) => theme({ shine: on || undefined })}
      />
      <Select
        label="Efeitos do fundo"
        value={th.effects ?? "none"}
        options={[
          { value: "none", label: "Nenhum" },
          { value: "electric", label: "Elétrico (raios, neon, engrenagens, faíscas)" },
          { value: "glitter", label: "Glitter (brilho caindo, pétalas, anel no logo)" },
        ]}
        onChange={(v) => theme({ effects: v === "none" ? undefined : v })}
      />
      {th.effects === "electric" && (
        <p className="text-xs text-muted">
          As luzes usam as cores da borda neon (acima). Com o logo sem moldura, ganha um anel de luz
          girando. Ficam parados para quem desligou as animações no celular.
        </p>
      )}
      {th.effects === "glitter" && (
        <p className="text-xs text-muted">
          O glitter usa as cores da borda e a cor do texto dos painéis; o logo ganha um anel de
          brilho girando. Fica parado para quem desligou as animações no celular.
        </p>
      )}
    </div>
  );
}

export function LookPanel({ doc, dispatch }: { doc: BioDocument; dispatch: Dispatch }) {
  const th = doc.theme;
  return (
    <div className="grid gap-4">
      <Section title="Tema pronto">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {THEME_IDS.map((id) => {
            const t = THEMES[id];
            const active =
              th.colors.cardTop === t.theme.colors.cardTop &&
              th.colors.base === t.theme.colors.base;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                onClick={() => dispatch({ type: "theme-preset", themeId: id })}
                className={`flex flex-col gap-2 rounded-md border p-2 text-left text-sm ${active ? "border-accent ring-2 ring-accent" : "border-border"}`}
              >
                <span className="font-medium">{t.label}</span>
                <span aria-hidden="true" className="flex h-5 overflow-hidden rounded">
                  {[
                    t.theme.colors.cardTop,
                    t.theme.colors.cardBottom,
                    t.theme.colors.accent,
                    t.ticker.bg,
                  ].map((c, i) => (
                    <span key={i} className="flex-1" style={{ background: c }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </Section>
      <Section title="Estilo">
        <Select
          label="Estilo dos cartões"
          value={th.cardStyle ?? "theme"}
          options={[
            { value: "neon", label: "Padrão — Vidro neon" },
            { value: "tint", label: "Padrão — Cor do ícone" },
            { value: "dark", label: "Padrão — Escuro" },
            { value: "satin", label: "Padrão — Cetim (claro, texto na cor dos painéis)" },
            { value: "deep", label: "Padrão — Cor dos cartões (degradê do tema, texto à escolha)" },
            { value: "theme", label: "Antigo — Cor do tema" },
            { value: "light", label: "Antigo — Claros" },
            { value: "glass", label: "Antigo — Futurista" },
          ]}
          onChange={(v) =>
            dispatch({ type: "theme", patch: { cardStyle: v === "theme" ? undefined : v } })
          }
        />
        {isStandardStyle(th.cardStyle) && (
          <p className="text-xs text-muted">
            Todos os cartões iguais, sem destaque. O fundo da página (aba Topo) e a cor do texto dos
            painéis (abaixo) dão o tom: ela colore as categorias, o contorno do nome e a base dos
            cartões.
          </p>
        )}
        {isStandardStyle(th.cardStyle) && <StandardDetails doc={doc} dispatch={dispatch} />}
        {th.cardStyle === "glass" && (
          <>
            <Select
              label="Cor dos cartões"
              value={th.cardTint ?? "icon"}
              options={[
                { value: "icon", label: "Cor de cada ícone" },
                { value: "black", label: "Preto transparente" },
                { value: "custom", label: "Uma cor para todos" },
              ]}
              onChange={(v) =>
                dispatch({
                  type: "theme",
                  patch: {
                    cardTint: v === "icon" ? undefined : v,
                    cardTintColor: v === "custom" ? (th.cardTintColor ?? "#2f8cff") : undefined,
                  },
                })
              }
            />
            {th.cardTint === "custom" && th.cardTintColor && (
              <ColorField
                label="Cor dos cartões"
                value={th.cardTintColor}
                onChange={(v) =>
                  dispatch({ type: "theme", patch: { cardTintColor: v } }, "theme.cardTintColor")
                }
              />
            )}
            <Check
              label="Fundo em movimento"
              checked={th.motion !== false}
              onChange={(on) =>
                dispatch({ type: "theme", patch: { motion: on ? undefined : false } })
              }
            />
            <p className="text-xs text-muted">
              Luzes nas cores do topo (Cor 1, 2 e 3, na aba Topo) se movendo devagar. Ficam paradas
              para quem desligou as animações no celular ou no computador.
            </p>
          </>
        )}
        <Select
          label="Padrão ilustrado"
          value={th.pattern}
          options={PATTERN_IDS.map((p) => ({ value: p, label: PATTERNS[p].label }))}
          onChange={(pattern) => dispatch({ type: "pattern", pattern })}
        />
        <Select
          label="Cantos"
          value={th.radius}
          options={[
            { value: "square", label: "Retos" },
            { value: "soft", label: "Arredondados" },
            { value: "pill", label: "Pílula" },
          ]}
          onChange={(radius) => dispatch({ type: "theme", patch: { radius } })}
        />
        <Select
          label="Fonte dos títulos"
          value={th.fonts.display}
          options={FONT_IDS.map((f) => ({ value: f, label: FONTS[f].label }))}
          onChange={(display) =>
            dispatch({ type: "theme", patch: { fonts: { ...th.fonts, display } } })
          }
        />
        <Select
          label="Fonte do texto"
          value={th.fonts.body}
          options={FONT_IDS.filter((f) => !isItalicFont(f)).map((f) => ({
            value: f,
            label: FONTS[f].label,
          }))}
          onChange={(body) => dispatch({ type: "theme", patch: { fonts: { ...th.fonts, body } } })}
        />
      </Section>
      <Section title="Cores">
        <p className="text-sm text-muted">
          Comece por um tema pronto e ajuste o que quiser. Cada cartão também pode ter cor própria
          (aba Blocos). Combinações difíceis de ler são recusadas ao salvar.
        </p>
        {COLOR_GROUPS.map((g) => (
          <div key={g.title} className="grid gap-2">
            <h3 className="text-sm font-semibold">{g.title}</h3>
            <div className="grid gap-2 xl:grid-cols-2">
              {g.colors.map(([k, label]) => (
                <ColorField
                  key={k}
                  label={label}
                  value={th.colors[k]}
                  onChange={(v) =>
                    dispatch({ type: "theme", patch: { colors: { [k]: v } } }, `theme.${k}`)
                  }
                />
              ))}
            </div>
          </div>
        ))}
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Faixa de avisos</h3>
          <div className="grid gap-2 xl:grid-cols-2">
            <ColorField
              label="Fundo da faixa"
              value={doc.tickerTheme.bg}
              onChange={(bg) => dispatch({ type: "ticker-theme", patch: { bg } }, "tickerTheme.bg")}
            />
            <ColorField
              label="Letra da faixa"
              value={doc.tickerTheme.fg}
              onChange={(fg) => dispatch({ type: "ticker-theme", patch: { fg } }, "tickerTheme.fg")}
            />
          </div>
          {doc.ticker.colors && (
            <p className="text-xs text-muted">
              A faixa está com cores próprias (aba Faixa), que têm prioridade sobre estas.
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <h3 className="text-sm font-semibold">Botão flutuante do WhatsApp</h3>
          <div className="flex flex-wrap items-center gap-3">
            <ColorField
              label="Cor do botão"
              value={doc.floatingWhatsappColor ?? WHATSAPP_GREEN}
              onChange={(color) =>
                dispatch({ type: "floating-whatsapp-color", color }, "floatingWhatsappColor")
              }
            />
            {doc.floatingWhatsappColor && (
              <button
                type="button"
                onClick={() => dispatch({ type: "floating-whatsapp-color" })}
                className="rounded-md border border-border bg-white px-3 py-1.5 text-sm"
              >
                Voltar ao verde do WhatsApp
              </button>
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}
