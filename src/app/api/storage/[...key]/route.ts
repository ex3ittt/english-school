import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { Readable, Writable } from "node:stream";
import { env } from "@/lib/env";
import { localPath } from "@/lib/storage/local";
import { verifyLocal } from "@/lib/storage/sign";

export const runtime = "nodejs";

/*
 * Отдача и приём файлов локального драйвера (только для разработки).
 * В продакшене браузер ходит в S3/R2/Supabase по их подписанным ссылкам.
 */

const TYPES: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  pdf: "application/pdf",
};

type Ctx = { params: Promise<{ key: string[] }> };

function denied(message = "Ссылка недействительна или устарела") {
  return new Response(message, { status: 403 });
}

export async function GET(request: Request, { params }: Ctx) {
  if (process.env.STORAGE_DRIVER === "s3") return new Response(null, { status: 404 });
  const key = (await params).key.map(decodeURIComponent).join("/");
  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("exp"));
  const name = url.searchParams.get("name") ?? "";
  if (!verifyLocal(env.appSecret, "get", key, exp, url.searchParams.get("sig") ?? "", name)) return denied();

  let file: string;
  let size: number;
  try {
    file = localPath(key);
    size = (await stat(file)).size;
  } catch {
    return new Response("Файл не найден", { status: 404 });
  }

  const type = TYPES[path.extname(file).slice(1)] ?? "application/octet-stream";
  const headers = new Headers({
    "Content-Type": type,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  if (name) headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);

  // Range-запросы нужны видео для перемотки.
  const range = request.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(end - start + 1));
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, { status: 206, headers });
  }

  headers.set("Content-Length", String(size));
  return new Response(Readable.toWeb(createReadStream(file)) as ReadableStream, { status: 200, headers });
}

export async function PUT(request: Request, { params }: Ctx) {
  if (process.env.STORAGE_DRIVER === "s3") return new Response(null, { status: 404 });
  const key = (await params).key.map(decodeURIComponent).join("/");
  const url = new URL(request.url);
  const exp = Number(url.searchParams.get("exp"));
  const contentType = request.headers.get("content-type") ?? "";
  if (!verifyLocal(env.appSecret, "put", key, exp, url.searchParams.get("sig") ?? "", contentType)) return denied();
  if (!request.body) return new Response("Пустой файл", { status: 400 });

  const file = localPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await request.body.pipeTo(Writable.toWeb(createWriteStream(file)) as WritableStream);
  return new Response(null, { status: 200 });
}
