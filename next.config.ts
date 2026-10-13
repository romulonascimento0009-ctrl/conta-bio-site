import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // SAMEORIGIN: o editor exibirá a prévia do site em iframe do próprio app.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // PGlite carrega arquivos WASM em tempo de execução; não deve ser empacotado.
  serverExternalPackages: ["@electric-sql/pglite"],
  poweredByHeader: false,
  // Sites de clientes em <slug>.localhost durante o desenvolvimento.
  allowedDevOrigins: ["*.localhost"],
  experimental: {
    serverActions: {
      // Upload: o navegador reduz a foto antes; o servidor aceita até 4 MB por imagem
      // (abaixo do limite de 4,5 MB da Vercel e do proxyClientMaxBodySize de 10 MB).
      bodySizeLimit: "4.5mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
