export type HostTarget = { kind: "admin" } | { kind: "site"; slug: string };

/**
 * Decide se a requisição é do painel ou de um site de cliente pelo cabeçalho Host.
 * `<slug>.<rootDomain>` → site; o próprio domínio, `www.` ou hosts desconhecidos → painel.
 */
export function resolveHost(hostHeader: string | null, rootDomain: string): HostTarget {
  const host = (hostHeader ?? "").trim().toLowerCase();
  const root = rootDomain.trim().toLowerCase();
  if (host.endsWith(`.${root}`)) {
    const sub = host.slice(0, -(root.length + 1));
    if (sub !== "www" && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(sub))
      return { kind: "site", slug: sub };
  }
  return { kind: "admin" };
}

export function siteUrl(slug: string, rootDomain: string): string {
  const protocol = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(rootDomain) ? "http" : "https";
  return `${protocol}://${slug}.${rootDomain}`;
}
