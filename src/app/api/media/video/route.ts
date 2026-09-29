import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { canAccessLesson } from "@/lib/access";
import { getSessionUser } from "@/lib/auth/session";
import { toEmbedUrl } from "@/lib/embed";
import type { VideoPayload } from "@/lib/media";
import { storage } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "private, no-store" };

/**
 * Выдаёт короткоживущую ссылку на видео после проверки:
 * есть сессия, пользователь записан на курс, неделя открыта.
 */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Войдите в кабинет" }, { status: 401, headers: noStore });

  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const id = url.searchParams.get("id") ?? "";

  let source: { lessonId: string; provider: string | null; key: string | null; link: string | null; poster: string | null } | null =
    null;
  if (kind === "lesson") {
    const v = await db.lessonVideo.findUnique({ where: { id } });
    if (v) source = { lessonId: v.lessonId, provider: v.provider, key: v.videoKey, link: v.videoUrl, poster: v.posterKey };
  } else if (kind === "block") {
    const b = await db.lessonBlock.findUnique({ where: { id } });
    if (b?.type === "VIDEO")
      source = { lessonId: b.lessonId, provider: b.videoProvider, key: b.videoKey, link: b.videoUrl, poster: b.posterKey };
  }
  if (!source) return NextResponse.json({ error: "Видео не найдено" }, { status: 404, headers: noStore });
  if (!(await canAccessLesson(user, source.lessonId))) {
    return NextResponse.json({ error: "Эта неделя пока закрыта" }, { status: 403, headers: noStore });
  }

  let payload: VideoPayload;
  if (source.provider === "VIMEO" || source.provider === "KINESCOPE") {
    const embed = source.link ? toEmbedUrl(source.provider, source.link) : null;
    if (!embed) return NextResponse.json({ error: "Ссылка на видео некорректна" }, { status: 422, headers: noStore });
    payload = { type: "embed", url: embed, provider: source.provider };
  } else {
    if (!source.key) return NextResponse.json({ error: "Видео ещё не загружено" }, { status: 404, headers: noStore });
    const ttl = env.mediaTtl;
    const store = storage();
    payload = {
      type: "file",
      url: await store.signedGetUrl(source.key, { ttl, contentType: "video/mp4" }),
      poster: source.poster ? await store.signedGetUrl(source.poster, { ttl }) : null,
      expiresIn: ttl,
    };
  }
  return NextResponse.json(payload, { headers: noStore });
}
