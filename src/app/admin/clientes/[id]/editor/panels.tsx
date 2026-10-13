"use client";

import { useId, useState, type ReactNode } from "react";
import { inputClass } from "@/app/admin/_components/form";
import { instagramField, parseHours, phoneField, whatsappField } from "@/clients/briefing";
import {
  resolveLink,
  type BioDocument,
  type Block,
  type BlockOf,
  type LinkAction,
} from "@/sites/bio";
import { FONT_IDS, FONTS } from "@/sites/fonts";
import { ICON_IDS, ICONS } from "@/sites/icons";
import { NEW_BLOCK_TYPES, newBlock, type NewBlockType } from "@/sites/operations";
import { PATTERN_IDS, PATTERNS } from "@/sites/patterns";
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  multiline?: boolean;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-12 rounded border border-border"
      />
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
    </div>
  );
}

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
          disabled={newType === "gallery" && !assets.length}
          className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          Adicionar
        </button>
        {newType === "gallery" && !assets.length && (
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
            hint="Fica visível para quem abrir o Bio Site. Vazia = rede aberta."
            onChange={(v) => set({ password: v, security: v ? "WPA" : "nopass" }, "password")}
            maxLength={63}
          />
          <Check
            label="Mostrar QR code para conectar"
            checked={block.showQr}
            onChange={(v) => set({ showQr: v }, "showQr")}
          />
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
        </Section>
      );
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
        hint="Vazio = texto automático (ex.: @perfil, nota do Google, endereço)."
        onChange={(v) => set({ subtitle: v }, "subtitle")}
        maxLength={90}
      />
      <TextField
        label="Selo (opcional)"
        value={block.badge ?? ""}
        placeholder="Ex.: Responde rápido"
        onChange={(v) => set({ badge: v }, "badge")}
        maxLength={30}
      />
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
      <Select
        label="Estilo"
        value={block.variant}
        options={[
          { value: "solid", label: "Cor do tema" },
          { value: "light", label: "Claro" },
        ]}
        onChange={(variant) => set({ variant }, "variant")}
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
          label="Frase curta"
          value={p.tagline ?? ""}
          onChange={(v) => set({ tagline: v }, "tagline")}
          maxLength={120}
        />
        <ListField
          label="Categorias"
          multiline={false}
          hint="Separadas por vírgula (até 6)."
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
        <ImagePicker
          label="Foto de fundo (fica desfocada)"
          assets={assets}
          value={p.background?.assetId}
          onChange={(id) => set({ background: ref(id) }, "background")}
        />
      </Section>
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

/** Normaliza como o briefing (ex.: link do Instagram → @perfil) quando o valor já é válido. */
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
          hint="@perfil ou link do perfil"
          onChange={(v) => set("instagram", normalize(instagramField, v))}
        />
        <TextField
          label="Link para avaliar no Google"
          type="url"
          value={c.googleReviewUrl ?? ""}
          onChange={(v) => set("googleReviewUrl", v)}
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
          hint="Com DDI e DDD: 55 11 99999-8888"
          onChange={(v) => set("whatsapp", normalize(whatsappField, v))}
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
          type="url"
          value={c.mapsUrl ?? ""}
          onChange={(v) => set("mapsUrl", v)}
        />
      </Section>
      <Section title="Outras redes">
        <TextField
          label="Facebook (link)"
          type="url"
          value={c.facebookUrl ?? ""}
          onChange={(v) => set("facebookUrl", v)}
        />
        <TextField
          label="TikTok"
          value={c.tiktok ?? ""}
          placeholder="perfil"
          onChange={(v) => set("tiktok", v.replace(/^@/, ""))}
        />
        <TextField
          label="YouTube (link)"
          type="url"
          value={c.youtubeUrl ?? ""}
          onChange={(v) => set("youtubeUrl", v)}
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

/* ---------- Aparência ---------- */

const COLOR_LABELS: Record<keyof BioDocument["theme"]["colors"], string> = {
  cardTop: "Cartões (topo do degradê)",
  cardBottom: "Cartões (base do degradê)",
  accent: "Categorias",
  base: "Fundo da página",
  ink: "Texto dos painéis",
  inkMuted: "Texto secundário dos painéis",
  logoBg: "Fundo do monograma",
  logoFg: "Letras do monograma",
  glow1: "Fundo sem foto — cor 1",
  glow2: "Fundo sem foto — cor 2",
  glow3: "Fundo sem foto — cor 3",
};

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
          options={FONT_IDS.map((f) => ({ value: f, label: FONTS[f].label }))}
          onChange={(body) => dispatch({ type: "theme", patch: { fonts: { ...th.fonts, body } } })}
        />
      </Section>
      <details className="rounded-md border border-border p-4">
        <summary className="cursor-pointer font-semibold">Cores avançadas</summary>
        <p className="mt-2 text-xs text-muted">
          Combinações sem contraste suficiente para leitura são recusadas ao salvar.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(Object.keys(COLOR_LABELS) as (keyof typeof COLOR_LABELS)[]).map((k) => (
            <ColorField
              key={k}
              label={COLOR_LABELS[k]}
              value={th.colors[k]}
              onChange={(v) =>
                dispatch({ type: "theme", patch: { colors: { [k]: v } } }, `theme.${k}`)
              }
            />
          ))}
        </div>
      </details>
    </div>
  );
}
