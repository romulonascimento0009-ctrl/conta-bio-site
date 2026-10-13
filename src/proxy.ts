import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";
import { resolveHost } from "@/lib/hosts";

const PROTECTED = ["/admin", "/preview"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const target = resolveHost(
    request.headers.get("host"),
    process.env.ROOT_DOMAIN ?? "localhost:3000",
  );

  // Subdomínio de cliente → rota interna do site público.
  if (target.kind === "site") {
    const url = request.nextUrl.clone();
    url.pathname = `/s/${target.slug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(url);
  }

  // A rota interna dos sites não é acessível pelo domínio do painel.
  if (pathname === "/s" || pathname.startsWith("/s/")) {
    return new NextResponse(null, { status: 404 });
  }

  // Redirecionamento otimista: só verifica se o cookie existe.
  // A validação real da sessão acontece em requireSession() no servidor.
  if (
    PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`)) &&
    !getSessionCookie(request)
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Tudo, exceto arquivos internos do Next e a rota de mídia (servida igual em qualquer host).
  matcher: ["/((?!_next/static|_next/image|media/|favicon.ico).*)"],
};
