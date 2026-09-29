import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { newStorageKey, storage, UPLOAD_RULES, type UploadKind } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Выдаёт админу временную ссылку для загрузки файла прямо в хранилище.
 * Файл идёт из браузера в S3/R2/Supabase, минуя сервер Next.js
 * (у Vercel лимит на размер тела запроса 4,5 МБ).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return NextResponse.json({ error: "Недостаточно прав" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as {
    kind?: UploadKind;
    contentType?: string;
    size?: number;
    fileName?: string;
  } | null;
  const kind = body?.kind;
  if (!kind || !(kind in UPLOAD_RULES)) return NextResponse.json({ error: "Неизвестный тип загрузки" }, { status: 400 });

  const rule = UPLOAD_RULES[kind];
  const contentType = String(body.contentType ?? "");
  const size = Number(body.size ?? 0);
  if (!rule.types.test(contentType)) {
    return NextResponse.json({ error: `Этот формат не подходит. Можно: ${rule.label}.` }, { status: 415 });
  }
  if (!size || size > rule.maxBytes) {
    const limit = rule.maxBytes >= 1024 ** 3 ? `${rule.maxBytes / 1024 ** 3} ГБ` : `${rule.maxBytes / 1024 ** 2} МБ`;
    return NextResponse.json({ error: `Файл слишком большой. Максимум — ${limit}.` }, { status: 413 });
  }

  const key = newStorageKey(kind, contentType, body.fileName);
  const url = await storage().signedPutUrl(key, contentType, 60 * 60);
  return NextResponse.json({ key, url }, { headers: { "Cache-Control": "no-store" } });
}
