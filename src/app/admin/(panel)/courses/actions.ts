"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { removeIfUnused } from "@/lib/storage/cleanup";

export type CourseState = { error?: string; ok?: string };

function refreshCourse(courseId: string) {
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`, "layout");
  revalidatePath("/courses");
  revalidatePath(`/course/${courseId}`, "layout");
}

export async function createCourseAction(formData: FormData) {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim() || "Новый курс";
  const last = await db.course.aggregate({ _max: { sortOrder: true } });
  const course = await db.course.create({
    data: { title, sortOrder: (last._max.sortOrder ?? 0) + 1, isPublished: false },
  });
  redirect(`/admin/courses/${course.id}`);
}

export async function updateCourseAction(courseId: string, _: CourseState, formData: FormData): Promise<CourseState> {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 2) return { error: "Укажите название курса." };
  await db.course.update({
    where: { id: courseId },
    data: {
      title,
      level: String(formData.get("level") ?? "").trim().slice(0, 40),
      levelCode: String(formData.get("levelCode") ?? "").trim().slice(0, 4),
      description: String(formData.get("description") ?? "").trim().slice(0, 1200),
      isMain: formData.get("isMain") === "on",
      isPublished: formData.get("isPublished") === "on",
      autoUnlock: formData.get("autoUnlock") === "on",
    },
  });
  refreshCourse(courseId);
  return { ok: "Курс сохранён." };
}

export async function setCourseCoverAction(courseId: string, key: string | null) {
  await assertAdmin();
  const before = await db.course.findUnique({ where: { id: courseId }, select: { coverKey: true } });
  await db.course.update({ where: { id: courseId }, data: { coverKey: key } });
  if (before?.coverKey && before.coverKey !== key) await removeIfUnused([before.coverKey]);
  refreshCourse(courseId);
}

export async function reorderCoursesAction(ids: string[]) {
  await assertAdmin();
  await db.$transaction(ids.map((id, index) => db.course.update({ where: { id }, data: { sortOrder: index + 1 } })));
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}

/** Все ключи файлов курса — чтобы почистить хранилище после удаления. */
async function collectCourseKeys(where: { courseId?: string; weekId?: string; lessonId?: string }) {
  const lessonWhere = where.lessonId
    ? { id: where.lessonId }
    : where.weekId
      ? { day: { weekId: where.weekId } }
      : { day: { week: { courseId: where.courseId } } };
  const [videos, blocks] = await Promise.all([
    db.lessonVideo.findMany({ where: { lesson: lessonWhere }, select: { videoKey: true, posterKey: true } }),
    db.lessonBlock.findMany({ where: { lesson: lessonWhere }, select: { videoKey: true, posterKey: true, fileKey: true } }),
  ]);
  return [...videos.flatMap((v) => [v.videoKey, v.posterKey]), ...blocks.flatMap((b) => [b.videoKey, b.posterKey, b.fileKey])];
}

export async function deleteCourseAction(courseId: string) {
  await assertAdmin();
  const course = await db.course.findUnique({ where: { id: courseId }, select: { coverKey: true } });
  const keys = [course?.coverKey, ...(await collectCourseKeys({ courseId }))];
  await db.course.delete({ where: { id: courseId } });
  await removeIfUnused(keys);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
  redirect("/admin/courses");
}

/* ---- Недели ------------------------------------------------------------- */

export async function addWeekAction(courseId: string) {
  await assertAdmin();
  const last = await db.week.aggregate({ where: { courseId }, _max: { number: true } });
  const number = (last._max.number ?? 0) + 1;
  // Сразу создаём все семь дней: в админке остаётся только добавлять уроки.
  await db.week.create({
    data: { courseId, number, days: { create: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({ dayOfWeek })) } },
  });
  refreshCourse(courseId);
}

export async function updateWeekAction(weekId: string, formData: FormData) {
  await assertAdmin();
  const week = await db.week.update({
    where: { id: weekId },
    data: { title: String(formData.get("title") ?? "").trim().slice(0, 120) },
  });
  refreshCourse(week.courseId);
}

export async function deleteWeekAction(weekId: string) {
  await assertAdmin();
  const week = await db.week.findUniqueOrThrow({ where: { id: weekId } });
  const keys = await collectCourseKeys({ weekId });
  await db.week.delete({ where: { id: weekId } });
  // Сдвигаем номера следующих недель, чтобы не было «дыры».
  const later = await db.week.findMany({
    where: { courseId: week.courseId, number: { gt: week.number } },
    orderBy: { number: "asc" },
  });
  for (const w of later) await db.week.update({ where: { id: w.id }, data: { number: w.number - 1 } });
  await removeIfUnused(keys);
  refreshCourse(week.courseId);
}

/* ---- Дни и уроки --------------------------------------------------------- */

export async function updateDayAction(dayId: string, formData: FormData) {
  await assertAdmin();
  const day = await db.day.update({
    where: { id: dayId },
    data: { title: String(formData.get("title") ?? "").trim().slice(0, 80) },
    select: { week: { select: { courseId: true } } },
  });
  refreshCourse(day.week.courseId);
}

export async function addLessonAction(dayId: string, formData: FormData) {
  await assertAdmin();
  const title = String(formData.get("title") ?? "").trim() || "Новый урок";
  const last = await db.lesson.aggregate({ where: { dayId }, _max: { sortOrder: true } });
  const lesson = await db.lesson.create({ data: { dayId, title, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
  redirect(`/admin/lessons/${lesson.id}`);
}

export async function reorderLessonsAction(ids: string[]) {
  await assertAdmin();
  await db.$transaction(ids.map((id, index) => db.lesson.update({ where: { id }, data: { sortOrder: index + 1 } })));
  const first = ids[0] ? await db.lesson.findUnique({ where: { id: ids[0] }, select: { day: { select: { week: { select: { courseId: true } } } } } }) : null;
  if (first) refreshCourse(first.day.week.courseId);
}
