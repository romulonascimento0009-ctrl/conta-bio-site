import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { getStore } from "@netlify/blobs";
import path from "node:path";
import { env } from "@/lib/env";
import { assertSafeKey } from "./keys";

export { clientKey } from "./keys";

/** Armazenamento de arquivos: pasta local (desenvolvimento) ou Netlify Blobs (produção, D42). */
export interface Storage {
  put(key: string, data: Uint8Array): Promise<void>;
  /** Retorna `null` se a chave não existir. */
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
  /** Apaga tudo sob o prefixo (ex.: `clients/<id>` ao excluir um cliente). */
  deletePrefix(prefix: string): Promise<void>;
}

export function createLocalStorage(rootDir: string): Storage {
  const root = path.resolve(rootDir);

  function resolve(key: string): string {
    assertSafeKey(key);
    const full = path.resolve(root, ...key.split("/"));
    // Defesa extra: o caminho final precisa ficar dentro da raiz.
    if (!full.startsWith(root + path.sep)) throw new Error("Chave fora da raiz de armazenamento.");
    return full;
  }

  return {
    async put(key, data) {
      const file = resolve(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, data);
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(resolve(key)));
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw err;
      }
    },
    async delete(key) {
      await rm(resolve(key), { force: true });
    },
    async deletePrefix(prefix) {
      await rm(resolve(prefix), { recursive: true, force: true });
    },
  };
}

/** Netlify Blobs: dentro da Netlify o acesso vem do ambiente; fora dela, de `siteID` + `token`. */
export function createBlobStorage(options?: { siteID: string; token: string }): Storage {
  // "strong": a foto recém-enviada já aparece na próxima leitura (o editor mostra na hora).
  const store = getStore({ name: "files", consistency: "strong", ...options });
  return {
    async put(key, data) {
      assertSafeKey(key);
      await store.set(key, new Blob([new Uint8Array(data)]));
    },
    async get(key) {
      assertSafeKey(key);
      const data = (await store.get(key, { type: "arrayBuffer" })) as ArrayBuffer | null;
      return data ? new Uint8Array(data) : null;
    },
    async delete(key) {
      assertSafeKey(key);
      await store.delete(key);
    },
    async deletePrefix(prefix) {
      assertSafeKey(prefix);
      for await (const page of store.list({ prefix: `${prefix}/`, paginate: true }))
        for (const blob of page.blobs) await store.delete(blob.key);
    },
  };
}

let instance: Storage | undefined;

export function storage(): Storage {
  const { STORAGE_DRIVER, STORAGE_DIR, NETLIFY_SITE_ID, NETLIFY_API_TOKEN } = env();
  const remote =
    NETLIFY_SITE_ID && NETLIFY_API_TOKEN
      ? { siteID: NETLIFY_SITE_ID, token: NETLIFY_API_TOKEN }
      : undefined;
  instance ??=
    STORAGE_DRIVER === "netlify-blobs"
      ? createBlobStorage(remote)
      : createLocalStorage(STORAGE_DIR);
  return instance;
}
