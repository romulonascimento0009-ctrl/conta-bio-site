const SEGMENT = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;

/** Valida um segmento de chave: sem barras, sem `..`, sem caracteres especiais. */
export function assertSafeSegment(segment: string): void {
  if (!SEGMENT.test(segment) || segment.includes("..")) {
    throw new Error(`Segmento de chave inválido: ${JSON.stringify(segment)}`);
  }
}

/** Chave de armazenamento isolada por cliente: `clients/<clientId>/<...partes>`. */
export function clientKey(clientId: string, ...parts: string[]): string {
  if (parts.length === 0) throw new Error("Informe ao menos uma parte após o clientId.");
  for (const s of [clientId, ...parts]) assertSafeSegment(s);
  return ["clients", clientId, ...parts].join("/");
}

/** Valida uma chave completa (segmentos separados por `/`). */
export function assertSafeKey(key: string): void {
  const segments = key.split("/");
  if (segments.length < 2) throw new Error(`Chave inválida: ${JSON.stringify(key)}`);
  segments.forEach(assertSafeSegment);
}
