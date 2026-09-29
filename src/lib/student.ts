import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { computeWeekStates, type WeekState } from "@/lib/access";
import type { SessionUser } from "@/lib/auth/session";

export const DAY_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export const DAY_FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

/** Полка: все опубликованные курсы, отмеченные доступными или закрытыми. */
export async function getShelf(user: SessionUser) {
  const [courses, enrollments] = await Promise.all([
    db.course.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        title: true,
        level: true,
        levelCode: true,
        description: true,
        coverKey: true,
        isMain: true,
        weeks: { select: { number: true, days: { select: { lessons: { select: { id: true } } } } } },
      },
    }),
    db.enrollment.findMany({ where: { userId: user.id }, select: { courseId: true } }),
  ]);

  const enrolled = new Set(enrollments.map((e) => e.courseId));
  const allLessonIds = courses.flatMap((c) => c.weeks.flatMap((w) => w.days.flatMap((d) => d.lessons.map((l) => l.id))));
  const done = new Set(
    (
      await db.progress.findMany({ where: { userId: user.id, lessonId: { in: allLessonIds } }, select: { lessonId: true } })
    ).map((p) => p.lessonId),
  );

  const items = courses.map((c) => {
    const lessonIds = c.weeks.flatMap((w) => w.days.flatMap((d) => d.lessons.map((l) => l.id)));
    const completed = lessonIds.filter((id) => done.has(id)).length;
    return {
      id: c.id,
      title: c.title,
      level: c.level,
      levelCode: c.levelCode,
      description: c.description,
      coverKey: c.coverKey,
      isMain: c.isMain,
      weeksCount: c.weeks.length,
      available: user.role === "ADMIN" || enrolled.has(c.id),
      total: lessonIds.length,
      completed,
    };
  });

  const main = items.find((i) => i.available && i.isMain) ?? items.find((i) => i.available) ?? null;
  return { main, others: items.filter((i) => i !== main) };
}

/**
 * Всё для страниц курса: недели с состояниями, уроки, прогресс, куратор.
 * null — у пользователя нет доступа к курсу.
 */
export const getCourseForUser = cache(async (user: SessionUser, courseId: string) => {
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      weeks: {
        orderBy: { number: "asc" },
        include: {
          days: {
            orderBy: { dayOfWeek: "asc" },
            include: { lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } } },
          },
        },
      },
    },
  });
  if (!course) return null;

  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId: user.id, courseId } },
    include: { weekAccess: true },
  });
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && (!enrollment || !course.isPublished)) return null;

  const states: WeekState[] =
    enrollment && !isAdmin
      ? computeWeekStates(course.weeks, {
          startedAt: enrollment.startedAt,
          autoUnlock: course.autoUnlock,
          overrides: enrollment.weekAccess,
        })
      : course.weeks.map((w) => ({ weekId: w.id, number: w.number, open: true, opensAt: null, source: "default" }));
  const stateById = new Map(states.map((s) => [s.weekId, s]));

  const lessonIds = course.weeks.flatMap((w) => w.days.flatMap((d) => d.lessons.map((l) => l.id)));
  const done = new Set(
    (
      await db.progress.findMany({ where: { userId: user.id, lessonId: { in: lessonIds } }, select: { lessonId: true } })
    ).map((p) => p.lessonId),
  );

  const weeks = course.weeks.map((w) => {
    const ids = w.days.flatMap((d) => d.lessons.map((l) => l.id));
    const completed = ids.filter((id) => done.has(id)).length;
    const state = stateById.get(w.id)!;
    return {
      id: w.id,
      number: w.number,
      title: w.title,
      open: state.open,
      opensAt: state.opensAt,
      total: ids.length,
      completed,
      isDone: ids.length > 0 && completed === ids.length,
      days: w.days.map((d) => ({
        id: d.id,
        dayOfWeek: d.dayOfWeek,
        title: d.title,
        lessons: d.lessons.map((l) => ({ ...l, done: done.has(l.id) })),
      })),
    };
  });

  // Куда «продолжить»: первый непросмотренный урок в открытых неделях.
  let next: { weekNumber: number; dayOfWeek: number; title: string } | null = null;
  for (const w of weeks) {
    if (!w.open) continue;
    for (const d of w.days) {
      const l = d.lessons.find((x) => !x.done);
      if (l) {
        next = { weekNumber: w.number, dayOfWeek: d.dayOfWeek, title: l.title };
        break;
      }
    }
    if (next) break;
  }

  return {
    course: {
      id: course.id,
      title: course.title,
      level: course.level,
      levelCode: course.levelCode,
      description: course.description,
      autoUnlock: course.autoUnlock,
    },
    enrollment: enrollment
      ? {
          id: enrollment.id,
          curatorName: enrollment.curatorName,
          curatorSchedule: enrollment.curatorSchedule,
          preferredTeacherId: enrollment.preferredTeacherId,
          startedAt: enrollment.startedAt,
        }
      : null,
    weeks,
    total: lessonIds.length,
    completed: lessonIds.filter((id) => done.has(id)).length,
    next,
  };
});

export type CourseForUser = NonNullable<Awaited<ReturnType<typeof getCourseForUser>>>;

/** Содержимое одного дня: уроки, видео преподавателей, блоки. */
export async function getDayContent(dayId: string, userId: string) {
  const day = await db.day.findUnique({
    where: { id: dayId },
    include: {
      lessons: {
        orderBy: { sortOrder: "asc" },
        include: {
          videos: { select: { id: true, teacherId: true, provider: true } },
          blocks: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, type: true, title: true, text: true, fileName: true, fileSize: true, videoProvider: true },
          },
          progress: { where: { userId }, select: { completedAt: true } },
        },
      },
    },
  });
  if (!day) return null;

  const teacherIds = [...new Set(day.lessons.flatMap((l) => l.videos.map((v) => v.teacherId)))];
  const teachers = await db.teacher.findMany({
    where: { id: { in: teacherIds } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, bio: true, photoKey: true },
  });

  return {
    teachers,
    lessons: day.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      summary: l.summary,
      done: l.progress.length > 0,
      videos: l.videos,
      blocks: l.blocks,
    })),
  };
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(date);
}

export function pluralRu(n: number, one: string, few: string, many: string) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
