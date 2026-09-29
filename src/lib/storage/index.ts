import "server-only";
import { randomBytes } from "node:crypto";
import { env } from "@/lib/env";
import { createLocalDriver } from "./local";
import { createS3Driver } from "./s3";
import { createSupabaseDriver, supabaseConfigFromEnv } from "./supabase";
import type { StorageDriver } from "./types";

let driver: StorageDriver | null = null;

export function storage(): StorageDriver {
  if (driver) return driver;
  const kind = process.env.STORAGE_DRIVER ?? "local";
  if (kind === "supabase") {
    driver = createSupabaseDriver(supabaseConfigFromEnv());
  } else if (kind === "s3") {
    const need = ["S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"].filter((k) => !process.env[k]);
    if (need.length) throw new Error(`Для STORAGE_DRIVER=s3 не заданы: ${need.join(", ")}`);
    driver = createS3Driver({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || "auto",
      bucket: process.env.S3_BUCKET!,
      accessKeyId: process.env.S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    });
  } else {
    if (process.env.VERCEL) {
      // На Vercel диск только для чтения и не общий между запусками — файлы бы терялись.
      throw new Error("На Vercel нужен STORAGE_DRIVER=supabase или s3 — локальный диск там не сохраняет файлы");
    }
    driver = createLocalDriver(env.appSecret, env.appUrl);
  }
  return driver;
}

export type UploadKind = "video" | "image" | "file";

export const UPLOAD_RULES: Record<UploadKind, { maxBytes: number; types: RegExp; label: string }> = {
  video: { maxBytes: 5 * 1024 ** 3, types: /^video\/(mp4|webm|quicktime)$/, label: "MP4, WebM или MOV" },
  image: { maxBytes: 10 * 1024 ** 2, types: /^image\/(jpeg|png|webp|avif)$/, label: "JPG, PNG, WebP или AVIF" },
  file: {
    maxBytes: 100 * 1024 ** 2,
    types:
      /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.[\w.]+|audio\/(mpeg|mp4|x-m4a|wav)|application\/zip|text\/plain)$/,
    label: "PDF, DOCX, PPTX, XLSX, MP3, ZIP или TXT",
  },
};

const EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "application/pdf": "pdf",
};

/** Непредсказуемый ключ: по имени файла объект не угадать. */
export function newStorageKey(kind: UploadKind, contentType: string, fileName = "") {
  const fromName = fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const ext = EXT[contentType] ?? (fromName.slice(0, 6) || "bin");
  const folder = kind === "video" ? "videos" : kind === "image" ? "images" : "files";
  return `${folder}/${randomBytes(18).toString("base64url")}.${ext}`;
}
