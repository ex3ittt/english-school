import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { canAccessLesson } from "@/lib/access";
import { getSessionUser } from "@/lib/auth/session";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Скачивание прикреплённого файла: проверка доступа, затем редирект на временную ссылку. */
export async function GET(request: Request, { params }: { params: Promise<{ blockId: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const block = await db.lessonBlock.findUnique({ where: { id: (await params).blockId } });
  if (!block || block.type !== "FILE" || !block.fileKey) return new NextResponse("Файл не найден", { status: 404 });
  if (!(await canAccessLesson(user, block.lessonId))) return new NextResponse("Нет доступа", { status: 403 });

  const url = await storage().signedGetUrl(block.fileKey, { ttl: 120, fileName: block.fileName ?? undefined });
  return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
