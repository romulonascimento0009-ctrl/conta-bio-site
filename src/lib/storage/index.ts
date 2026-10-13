import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "@/lib/env";
import { assertSafeKey } from "./keys";

export { clientKey } from "./keys";

/** Armazenamento de arquivos. Implementação local agora; R2/S3 quando houver conta (DECISIONS P3). */
export interface Storage {
  put(key: string, data: Uint8Array): Promise<void>;
  /** Retorna `null` se a chave não existir. */
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
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
  };
}

let instance: Storage | undefined;

export function storage(): Storage {
  instance ??= createLocalStorage(env().STORAGE_DIR);
  return instance;
}
