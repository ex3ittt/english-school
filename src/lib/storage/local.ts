import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { signLocal } from "./sign";
import type { StorageDriver } from "./types";

export function localRoot() {
  // Локальный драйвер — только для разработки: не даём сборщику тащить папку в бандл.
  return path.resolve(/*turbopackIgnore: true*/ process.env.LOCAL_STORAGE_DIR ?? "storage");
}

/** Ключ → путь на диске, без выхода за пределы корня. */
export function localPath(key: string) {
  const root = localRoot();
  const full = path.resolve(root, key);
  if (!full.startsWith(root + path.sep)) throw new Error("Некорректный ключ файла");
  return full;
}

function encodeKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/**
 * Хранилище на диске для разработки. Ссылки такие же «подписанные»,
 * как у S3: без подписи и после истечения срока файл не отдаётся.
 */
export function createLocalDriver(secret: string, baseUrl: string): StorageDriver {
  return {
    async signedGetUrl(key, { ttl, fileName }) {
      const exp = Math.floor(Date.now() / 1000) + ttl;
      const params = new URLSearchParams({ exp: String(exp), sig: signLocal(secret, "get", key, exp, fileName ?? "") });
      if (fileName) params.set("name", fileName);
      return `${baseUrl}/api/storage/${encodeKey(key)}?${params}`;
    },
    async signedPutUrl(key, contentType, ttl) {
      const exp = Math.floor(Date.now() / 1000) + ttl;
      const params = new URLSearchParams({ exp: String(exp), sig: signLocal(secret, "put", key, exp, contentType) });
      return `${baseUrl}/api/storage/${encodeKey(key)}?${params}`;
    },
    async put(key, body) {
      const file = localPath(key);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    },
    async remove(key) {
      await rm(localPath(key), { force: true });
    },
  };
}
