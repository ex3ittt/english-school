"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { canAccessLesson } from "@/lib/access";
import { getSessionUser } from "@/lib/auth/session";

export async function setLessonDone(lessonId: string, done: boolean): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user) return { error: "Сессия истекла. Войдите снова." };
  if (!(await canAccessLesson(user, lessonId))) return { error: "Этот урок пока закрыт." };

  if (done) {
    await db.progress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId } },
      create: { userId: user.id, lessonId },
      update: {},
    });
  } else {
    await db.progress.deleteMany({ where: { userId: user.id, lessonId } });
  }

  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { day: { select: { week: { select: { courseId: true } } } } } });
  if (lesson) revalidatePath(`/course/${lesson.day.week.courseId}`, "layout");
  revalidatePath("/courses");
  return {};
}

/** Запоминаем выбранного преподавателя для курса. */
export async function setPreferredTeacher(courseId: string, teacherId: string): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  const teacher = await db.teacher.findUnique({ where: { id: teacherId }, select: { id: true } });
  if (!teacher) return;
  await db.enrollment.updateMany({ where: { userId: user.id, courseId }, data: { preferredTeacherId: teacherId } });
}
