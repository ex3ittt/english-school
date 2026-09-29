"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { toEmbedUrl } from "@/lib/embed";
import { removeIfUnused } from "@/lib/storage/cleanup";

export type LessonState = { error?: string; ok?: string };

async function refreshLesson(lessonId: string) {
  const lesson = await db.lesson.findUnique({
    where: { id: lessonId },
    select: { day: { select: { weekId: true, week: { select: { courseId: true } } } } },
  });
  revalidatePath(`/admin/lessons/${lessonId}`);
  if (lesson) {
    revalidatePath(`/admin/courses/${lesson.day.week.courseId}`, "layout");
    revalidatePath(`/course/${lesson.day.week.courseId}`, "layout");
  }
}

function readLink(formData: FormData): { provider: "VIMEO" | "KINESCOPE"; url: string } | { error: string } {
  const provider = String(formData.get("provider") ?? "") as "VIMEO" | "KINESCOPE";
  const url = String(formData.get("url") ?? "").trim();
  if (provider !== "VIMEO" && provider !== "KINESCOPE") return { error: "Выберите сервис: Vimeo или Kinescope." };
  if (!toEmbedUrl(provider, url)) {
    return {
      error:
        provider === "VIMEO"
          ? "Не похоже на ссылку Vimeo. Пример: https://vimeo.com/123456789"
          : "Не похоже на ссылку Kinescope. Пример: https://kinescope.io/abc123",
    };
  }
  return { provider, url };
}

export async function updateLessonAction(lessonId: string, _: LessonState, formData: FormData): Promise<LessonState> {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { error: "Укажите название урока." };
  await db.lesson.update({
    where: { id: lessonId },
    data: { title: title.slice(0, 160), summary: String(formData.get("summary") ?? "").trim().slice(0, 600) },
  });
  await refreshLesson(lessonId);
  return { ok: "Урок сохранён." };
}

export async function deleteLessonAction(lessonId: string) {
  await assertAdmin();
  const lesson = await db.lesson.findUniqueOrThrow({
    where: { id: lessonId },
    include: { videos: true, blocks: true, day: { select: { weekId: true, week: { select: { courseId: true } } } } },
  });
  await db.lesson.delete({ where: { id: lessonId } });
  await removeIfUnused([
    ...lesson.videos.flatMap((v) => [v.videoKey, v.posterKey]),
    ...lesson.blocks.flatMap((b) => [b.videoKey, b.posterKey, b.fileKey]),
  ]);
  const courseId = lesson.day.week.courseId;
  revalidatePath(`/course/${courseId}`, "layout");
  redirect(`/admin/courses/${courseId}/weeks/${lesson.day.weekId}`);
}

/* ---- Видео преподавателей ---------------------------------------------- */

export async function saveTeacherUploadAction(
  lessonId: string,
  teacherId: string,
  data: { videoKey: string; posterKey?: string; durationSec?: number },
) {
  await assertAdmin();
  const before = await db.lessonVideo.findUnique({ where: { lessonId_teacherId: { lessonId, teacherId } } });
  const fields = {
    provider: "UPLOAD" as const,
    videoKey: data.videoKey,
    videoUrl: null,
    posterKey: data.posterKey ?? null,
    durationSec: data.durationSec ?? null,
  };
  await db.lessonVideo.upsert({
    where: { lessonId_teacherId: { lessonId, teacherId } },
    create: { lessonId, teacherId, ...fields },
    update: fields,
  });
  if (before) await removeIfUnused([before.videoKey, before.posterKey]);
  await refreshLesson(lessonId);
}

export async function saveTeacherLinkAction(
  lessonId: string,
  teacherId: string,
  _: LessonState,
  formData: FormData,
): Promise<LessonState> {
  await assertAdmin();
  const link = readLink(formData);
  if ("error" in link) return { error: link.error };
  const before = await db.lessonVideo.findUnique({ where: { lessonId_teacherId: { lessonId, teacherId } } });
  const fields = { provider: link.provider, videoUrl: link.url, videoKey: null, posterKey: null, durationSec: null };
  await db.lessonVideo.upsert({
    where: { lessonId_teacherId: { lessonId, teacherId } },
    create: { lessonId, teacherId, ...fields },
    update: fields,
  });
  if (before) await removeIfUnused([before.videoKey, before.posterKey]);
  await refreshLesson(lessonId);
  return { ok: "Ссылка сохранена." };
}

export async function removeTeacherVideoAction(videoId: string) {
  await assertAdmin();
  const v = await db.lessonVideo.delete({ where: { id: videoId } });
  await removeIfUnused([v.videoKey, v.posterKey]);
  await refreshLesson(v.lessonId);
}

/* ---- Блоки урока -------------------------------------------------------- */

export async function addBlockAction(lessonId: string, type: "VIDEO" | "TEXT" | "FILE") {
  await assertAdmin();
  const last = await db.lessonBlock.aggregate({ where: { lessonId }, _max: { sortOrder: true } });
  const titles = { VIDEO: "Грамматический воркшоп", TEXT: "Домашнее задание", FILE: "Материалы" };
  await db.lessonBlock.create({
    data: { lessonId, type, title: titles[type], sortOrder: (last._max.sortOrder ?? 0) + 1, text: type === "TEXT" ? "" : null },
  });
  await refreshLesson(lessonId);
}

export async function updateBlockAction(blockId: string, _: LessonState, formData: FormData): Promise<LessonState> {
  await assertAdmin();
  const block = await db.lessonBlock.findUniqueOrThrow({ where: { id: blockId } });
  await db.lessonBlock.update({
    where: { id: blockId },
    data: {
      title: String(formData.get("title") ?? "").trim().slice(0, 160),
      ...(block.type === "TEXT" ? { text: String(formData.get("text") ?? "").slice(0, 20000) } : {}),
    },
  });
  await refreshLesson(block.lessonId);
  return { ok: "Сохранено." };
}

export async function setBlockUploadAction(
  blockId: string,
  data:
    | { kind: "video"; videoKey: string; posterKey?: string }
    | { kind: "file"; fileKey: string; fileName: string; fileSize: number },
) {
  await assertAdmin();
  const before = await db.lessonBlock.findUniqueOrThrow({ where: { id: blockId } });
  if (data.kind === "video") {
    if (before.type !== "VIDEO") throw new Error("Блок не видео");
    await db.lessonBlock.update({
      where: { id: blockId },
      data: { videoProvider: "UPLOAD", videoKey: data.videoKey, posterKey: data.posterKey ?? null, videoUrl: null },
    });
    await removeIfUnused([before.videoKey, before.posterKey]);
  } else {
    if (before.type !== "FILE") throw new Error("Блок не файл");
    await db.lessonBlock.update({
      where: { id: blockId },
      data: { fileKey: data.fileKey, fileName: data.fileName.slice(0, 200), fileSize: data.fileSize },
    });
    await removeIfUnused([before.fileKey]);
  }
  await refreshLesson(before.lessonId);
}

export async function setBlockLinkAction(blockId: string, _: LessonState, formData: FormData): Promise<LessonState> {
  await assertAdmin();
  const link = readLink(formData);
  if ("error" in link) return { error: link.error };
  const before = await db.lessonBlock.findUniqueOrThrow({ where: { id: blockId } });
  await db.lessonBlock.update({
    where: { id: blockId },
    data: { videoProvider: link.provider, videoUrl: link.url, videoKey: null, posterKey: null },
  });
  await removeIfUnused([before.videoKey, before.posterKey]);
  await refreshLesson(before.lessonId);
  return { ok: "Ссылка сохранена." };
}

export async function deleteBlockAction(blockId: string) {
  await assertAdmin();
  const b = await db.lessonBlock.delete({ where: { id: blockId } });
  await removeIfUnused([b.videoKey, b.posterKey, b.fileKey]);
  await refreshLesson(b.lessonId);
}

export async function reorderBlocksAction(ids: string[]) {
  await assertAdmin();
  await db.$transaction(ids.map((id, index) => db.lessonBlock.update({ where: { id }, data: { sortOrder: index + 1 } })));
  const first = ids[0] ? await db.lessonBlock.findUnique({ where: { id: ids[0] }, select: { lessonId: true } }) : null;
  if (first) await refreshLesson(first.lessonId);
}
