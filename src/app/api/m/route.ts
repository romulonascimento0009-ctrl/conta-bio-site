import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { recordEvent } from "@/data/metrics";

const MAX_BODY = 2048;

/**
 * Métricas do Bio Site público (visitas e cliques, via `navigator.sendBeacon`). Público e sem
 * cookies próprios; responde sempre 204 para não revelar nada. O IP só entra no hash diário
 * do visitante (D42: `x-nf-client-connection-ip`, preenchido pela Netlify; `x-forwarded-for` fora dela) e não é guardado.
 */
export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > 0 && text.length <= MAX_BODY) {
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      /* ignorado */
    }
    await recordEvent({
      body,
      ip:
        request.headers.get("x-nf-client-connection-ip") ??
        (request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0"),
      userAgent: request.headers.get("user-agent"),
      hasSession: !!getSessionCookie(request),
    });
  }
  return new Response(null, { status: 204 });
}
