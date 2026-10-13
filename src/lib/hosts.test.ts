import { describe, expect, it } from "vitest";
import { resolveHost, siteUrl } from "./hosts";

describe("resolveHost", () => {
  const root = "localhost:3000";
  it.each([
    ["localhost:3000", { kind: "admin" }],
    ["www.localhost:3000", { kind: "admin" }],
    ["bella.localhost:3000", { kind: "site", slug: "bella" }],
    ["BELLA.Localhost:3000", { kind: "site", slug: "bella" }],
    ["a.b.localhost:3000", { kind: "admin" }],
    ["-x.localhost:3000", { kind: "admin" }],
    ["bella.localhost:4000", { kind: "admin" }],
    ["127.0.0.1:3000", { kind: "admin" }],
    [null, { kind: "admin" }],
  ])("%s", (host, expected) => {
    expect(resolveHost(host, root)).toEqual(expected);
  });

  it("funciona com domínio de produção", () => {
    expect(resolveHost("bella.meusites.com.br", "meusites.com.br")).toEqual({
      kind: "site",
      slug: "bella",
    });
    expect(resolveHost("evil-meusites.com.br", "meusites.com.br")).toEqual({ kind: "admin" });
  });
});

describe("siteUrl", () => {
  it("http em localhost, https em produção", () => {
    expect(siteUrl("bella", "localhost:3000")).toBe("http://bella.localhost:3000");
    expect(siteUrl("bella", "meusites.com.br")).toBe("https://bella.meusites.com.br");
  });
});
