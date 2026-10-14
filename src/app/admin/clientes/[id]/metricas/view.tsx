import Link from "next/link";
import QRCode from "qrcode";
import { getClient } from "@/data/clients";
import { getMetrics, PERIODS, type Metrics, type Period } from "@/data/metrics";
import { getSite } from "@/data/sites";
import { publicUrl } from "@/lib/public-url";
import { TARGET_LABEL } from "@/sites/metrics";
import { CopyField } from "./copy-field";

const num = new Intl.NumberFormat("pt-BR");
const dayLabel = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
};

export function parsePeriod(v: unknown): Period {
  const n = Number(v);
  return (PERIODS as readonly number[]).includes(n) ? (n as Period) : 30;
}

/**
 * Métricas do Bio Site: visitas por dia e por origem (QR, NFC, Instagram…), cliques por cartão e
 * os links para QR code e NFC. Usada pelo operador (/admin) e pelo próprio cliente (/painel).
 */
export async function MetricsView({
  clientId,
  basePath,
  period,
}: {
  clientId: string;
  basePath: string;
  period: Period;
}) {
  const client = await getClient(clientId);
  if (!client) return null;
  const [metrics, site] = await Promise.all([getMetrics(client.id, period), getSite(client.id)]);
  if (!metrics) return null;

  const base = publicUrl(client.slug);
  const qrUrl = `${base}?o=qr`;
  const nfcUrl = `${base}?o=nfc`;
  const [qrSvg, qrPng] = await Promise.all([
    QRCode.toString(qrUrl, { type: "svg", errorCorrectionLevel: "M", margin: 2 }),
    QRCode.toDataURL(qrUrl, { errorCorrectionLevel: "M", margin: 2, width: 1024 }),
  ]);

  return (
    <div className="grid gap-10">
      <section aria-labelledby="metricas" className="grid gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="metricas" className="text-lg font-semibold">
              Métricas
            </h2>
            <p className="mt-1 text-sm text-muted">
              Visitas e toques no Bio Site publicado. Robôs e as suas próprias visitas logado não
              contam.
            </p>
          </div>
          <nav aria-label="Período" className="flex gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`${basePath}?dias=${p}`}
                aria-current={p === period ? "page" : undefined}
                className={`rounded-md border px-3 py-1.5 text-sm ${p === period ? "border-accent bg-accent text-white" : "border-border bg-white"}`}
              >
                {p} dias
              </Link>
            ))}
          </nav>
        </div>

        {!site?.publishedVersionId && (
          <p role="note" className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            O Bio Site ainda não foi publicado: as métricas começam a contar depois da publicação.
          </p>
        )}

        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <Stat label="Visitas" value={metrics.visits} />
          <Stat label="Visitantes únicos" value={metrics.visitors} hint="contados por dia" />
          <Stat
            label="Toques em links"
            value={metrics.clicks}
            hint={
              metrics.visits > 0
                ? `${Math.round((metrics.clicks / metrics.visits) * 100)}% das visitas`
                : undefined
            }
          />
        </dl>

        <DailyChart metrics={metrics} />

        <div className="grid gap-8 md:grid-cols-2">
          <BarList
            title="De onde vieram as visitas"
            empty="Nenhuma visita no período."
            rows={metrics.bySource.map((s) => ({ key: s.source, label: s.label, value: s.visits }))}
          />
          <BarList
            title="Onde tocaram"
            empty="Nenhum toque no período."
            rows={metrics.byTarget.map((t) => ({
              key: `${t.target}|${t.label}`,
              label: t.label,
              detail: TARGET_LABEL[t.target] !== t.label ? TARGET_LABEL[t.target] : undefined,
              value: t.clicks,
            }))}
          />
        </div>
      </section>

      <section aria-labelledby="qr-nfc" className="grid gap-4">
        <div>
          <h2 id="qr-nfc" className="text-lg font-semibold">
            Links para QR code e NFC
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Use estes links no material impresso e nas etiquetas NFC: assim as métricas separam quem
            entrou pelo QR code, pelo NFC ou por outros caminhos. Quem abre vê o Bio Site normal.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-start">
          <figure className="grid justify-items-start gap-2">
            <div
              className="w-44 rounded-md border border-border bg-white p-2"
              role="img"
              aria-label={`QR code que abre ${qrUrl}`}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <figcaption className="flex flex-wrap gap-2 text-sm">
              <a
                href={qrPng}
                download={`qr-${client.slug}.png`}
                className="rounded-md border border-border bg-white px-3 py-1.5 font-medium"
              >
                Baixar PNG
              </a>
              <a
                href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`}
                download={`qr-${client.slug}.svg`}
                className="rounded-md border border-border bg-white px-3 py-1.5 font-medium"
              >
                Baixar SVG (gráfica)
              </a>
            </figcaption>
          </figure>
          <div className="grid gap-4">
            <CopyField label="Link do QR code" value={qrUrl} />
            <CopyField
              label="Link para gravar na etiqueta NFC"
              value={nfcUrl}
              hint="Grave como “URL” com um app de NFC (ex.: NFC Tools) no celular."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="rounded-md border border-border p-3 sm:p-4">
      <dt className="text-xs text-muted sm:text-sm">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tabular-nums sm:text-3xl">{num.format(value)}</dd>
      {hint && <dd className="text-xs text-muted">{hint}</dd>}
    </div>
  );
}

/** Visitas por dia: colunas finas sobre uma linha de base, com dica ao passar o mouse. */
function DailyChart({ metrics }: { metrics: Metrics }) {
  const { perDay } = metrics;
  const max = Math.max(1, ...perDay.map((d) => d.visits));
  const best = perDay.reduce((a, b) => (b.visits > a.visits ? b : a), perDay[0]);
  return (
    <figure className="grid gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-semibold">Visitas por dia</span>
        {best.visits > 0 && (
          <span className="text-sm text-muted">
            Melhor dia: {dayLabel(best.day)} ({num.format(best.visits)})
          </span>
        )}
      </figcaption>
      {/* Colunas em HTML: acompanham a largura sem deformar (7, 30 ou 90 dias). */}
      <div
        role="img"
        aria-label={`Visitas por dia nos últimos ${metrics.days} dias; máximo ${max}.`}
        className="flex h-40 items-end gap-0.5 border-b border-border"
      >
        {perDay.map((d) => (
          // A coluna inteira é a área da dica (maior que a barra).
          <div
            key={d.day}
            title={`${dayLabel(d.day)}: ${num.format(d.visits)} visita(s)`}
            className="flex h-full min-w-0 flex-1 items-end justify-center hover:bg-neutral-100"
          >
            {d.visits > 0 && (
              <div
                className="w-full max-w-6 rounded-t bg-accent"
                style={{ height: `${Math.max(2, (d.visits / max) * 100)}%` }}
              />
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted tabular-nums">
        <span>{dayLabel(perDay[0].day)}</span>
        <span>{dayLabel(perDay[perDay.length - 1].day)}</span>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-accent">Ver em tabela</summary>
        <div
          className="mt-2 max-h-64 overflow-y-auto"
          tabIndex={0}
          role="region"
          aria-label="Visitas por dia em tabela"
        >
          <table className="w-full text-left">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-1 pr-4 font-medium">
                  Dia
                </th>
                <th scope="col" className="py-1 font-medium">
                  Visitas
                </th>
              </tr>
            </thead>
            <tbody>
              {[...perDay].reverse().map((d) => (
                <tr key={d.day} className="border-t border-border">
                  <td className="py-1 pr-4 tabular-nums">{dayLabel(d.day)}</td>
                  <td className="py-1 tabular-nums">{num.format(d.visits)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Lista com barra proporcional: rótulo e número em texto, a barra só reforça a comparação. */
function BarList({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: { key: string; label: string; detail?: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="grid content-start gap-3">
      <h3 className="font-semibold">{title}</h3>
      {total === 0 && <p className="text-sm text-muted">{empty}</p>}
      <ul className="grid gap-3">
        {rows.map((r) => (
          <li key={r.key} className="grid gap-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span>
                {r.label}
                {r.detail && <span className="text-muted"> ({r.detail})</span>}
              </span>
              <span className="font-semibold tabular-nums">{num.format(r.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-neutral-100" aria-hidden="true">
              {r.value > 0 && (
                <div
                  className="h-2 rounded-full bg-accent"
                  style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
