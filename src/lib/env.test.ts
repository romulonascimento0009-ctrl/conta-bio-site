import { describe, expect, it } from "vitest";
import { envSchema } from "./env";

const valid = {
  BETTER_AUTH_SECRET: "x".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
};

describe("envSchema", () => {
  it("aplica padrões e trata strings vazias como ausentes", () => {
    const env = envSchema.parse({ ...valid, DATABASE_URL: "", PGLITE_DIR: "" });
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.PGLITE_DIR).toBe(".data/pglite");
    expect(env.STORAGE_DIR).toBe(".data/storage");
  });

  it("rejeita segredo curto", () => {
    expect(envSchema.safeParse({ ...valid, BETTER_AUTH_SECRET: "curto" }).success).toBe(false);
  });

  it("chave da IA em outro formato (ex.: injetada pela Netlify) desliga a IA sem derrubar o site", () => {
    expect(
      envSchema.parse({ ...valid, ANTHROPIC_API_KEY: "nf-gateway-123" }).ANTHROPIC_API_KEY,
    ).toBeUndefined();
    expect(envSchema.parse({ ...valid, ANTHROPIC_API_KEY: "sk-ant-abc" }).ANTHROPIC_API_KEY).toBe(
      "sk-ant-abc",
    );
  });

  it("rejeita URL inválida", () => {
    expect(envSchema.safeParse({ ...valid, BETTER_AUTH_URL: "localhost" }).success).toBe(false);
  });
});
