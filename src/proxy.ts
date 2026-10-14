import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Redirecionamento otimista: só verifica se o cookie existe.
// A validação real (sessão e papel) acontece no servidor: requireOperator(), requireClientUser()
// e a camada de dados.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/painel/:path*", "/preview/:path*"],
};
