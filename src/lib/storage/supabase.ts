import { StorageClient } from "@supabase/storage-js";
import type { StorageDriver } from "./types";

type SupabaseConfig = { url: string; serviceKey: string; bucket: string };

/**
 * Supabase Storage через его собственный API (ключ service role остаётся на сервере).
 * Бакет приватный: файлы доступны только по временным подписанным ссылкам.
 */
export function createSupabaseDriver(cfg: SupabaseConfig): StorageDriver {
  const client = new StorageClient(`${cfg.url.replace(/\/$/, "")}/storage/v1`, {
    apikey: cfg.serviceKey,
    Authorization: `Bearer ${cfg.serviceKey}`,
  });
  const bucket = () => client.from(cfg.bucket);

  return {
    async signedGetUrl(key, { ttl, fileName }) {
      const { data, error } = await bucket().createSignedUrl(key, ttl, fileName ? { download: fileName } : undefined);
      if (error || !data) throw new Error(`Supabase: не удалось подписать ссылку (${error?.message})`);
      return data.signedUrl;
    },
    async signedPutUrl(key) {
      // Ссылка на загрузку у Supabase живёт 2 часа; браузер шлёт PUT с файлом и Content-Type.
      const { data, error } = await bucket().createSignedUploadUrl(key);
      if (error || !data) throw new Error(`Supabase: не удалось выдать ссылку на загрузку (${error?.message})`);
      return data.signedUrl;
    },
    async put(key, body, contentType) {
      const { error } = await bucket().upload(key, body, { contentType, upsert: true });
      if (error) throw new Error(`Supabase: не удалось загрузить ${key} (${error.message})`);
    },
    async remove(key) {
      const { error } = await bucket().remove([key]);
      if (error) throw new Error(`Supabase: не удалось удалить ${key} (${error.message})`);
    },
  };
}

/** Настройки из переменных окружения (имена совпадают с интеграцией Supabase в Vercel). */
export function supabaseConfigFromEnv(): SupabaseConfig {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !serviceKey) throw new Error("Для STORAGE_DRIVER=supabase нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  return { url, serviceKey, bucket: process.env.SUPABASE_BUCKET || "school-media" };
}
