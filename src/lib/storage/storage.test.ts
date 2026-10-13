import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createLocalStorage, type Storage } from "./index";
import { assertSafeKey, clientKey } from "./keys";

describe("clientKey", () => {
  it("monta chave isolada por cliente", () => {
    expect(clientKey("c123", "images", "logo.webp")).toBe("clients/c123/images/logo.webp");
  });

  it.each(["..", "../x", "a/b", "a\\b", "", ".oculto", "a b", "a..b"])(
    "rejeita segmento perigoso %j",
    (seg) => {
      expect(() => clientKey("c1", seg)).toThrow();
      expect(() => clientKey(seg, "x")).toThrow();
    },
  );

  it("exige ao menos uma parte além do cliente", () => {
    expect(() => clientKey("c1")).toThrow();
  });
});

describe("assertSafeKey", () => {
  it.each(["/abs/x", "clients//x", "clients/../x", "C:/x", "x"])("rejeita %j", (key) => {
    expect(() => assertSafeKey(key)).toThrow();
  });
});

describe("createLocalStorage", () => {
  let dir: string;
  let store: Storage;

  beforeAll(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "storage-test-"));
    store = createLocalStorage(dir);
  });

  afterAll(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("grava, lê e apaga", async () => {
    const key = clientKey("c1", "images", "a.bin");
    await store.put(key, new Uint8Array([1, 2, 3]));
    expect(await store.get(key)).toEqual(new Uint8Array([1, 2, 3]));
    await store.delete(key);
    expect(await store.get(key)).toBeNull();
  });

  it("apaga um prefixo inteiro sem afetar outros clientes", async () => {
    await store.put(clientKey("c1", "a", "1.webp"), new Uint8Array([1]));
    await store.put(clientKey("c2", "a", "1.webp"), new Uint8Array([2]));
    await store.deletePrefix("clients/c1");
    expect(await store.get(clientKey("c1", "a", "1.webp"))).toBeNull();
    expect(await store.get(clientKey("c2", "a", "1.webp"))).toEqual(new Uint8Array([2]));
  });

  it("recusa chave que tenta sair da raiz", async () => {
    await expect(store.put("clients/../../fora", new Uint8Array())).rejects.toThrow();
  });
});
