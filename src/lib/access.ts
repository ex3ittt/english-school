import "server-only";
import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type WeekState = {
  weekId: string;
  number: number;
  open: boolean;
  /** Когда неделя откроется сама (если включено автооткрытие). */
  opensAt: Date | null;
  /** Откуда решение: ручное (админ) или по правилам курса. */
  source: "manual" | "auto" | "default";
};

type WeekLike = { id: string; number: number };
type OverrideLike = { weekId: string; mode: "OPEN" | "CLOSED"; changedAt: Date };

/**
 * Какие недели открыты ученику.
 * - Ручное решение админа всегда важнее правил.
 * - Первая неделя открыта с даты старта записи.
 * - С автооткрытием неделя N открывается через 7 дней после того, как открылась N-1.
 *   Если N-1 админ открыл вручную раньше срока, отсчёт идёт от этого момента.
 */
export function computeWeekStates(
  weeks: WeekLike[],
  opts: { startedAt: Date; autoUnlock: boolean; overrides: OverrideLike[]; now?: Date },
): WeekState[] {
  const now = opts.now ?? new Date();
  const overrides = new Map(opts.overrides.map((o) => [o.weekId, o]));
  const sorted = [...weeks].sort((a, b) => a.number - b.number);

  // Дата, когда открылась (или по расписанию откроется) предыдущая неделя.
  let prevAt: Date | null = null;
  const states = sorted.map((week, index): WeekState => {
    const override = overrides.get(week.id);

    if (override) {
      const open = override.mode === "OPEN";
      prevAt = open ? override.changedAt : null;
      return { weekId: week.id, number: week.number, open, opensAt: null, source: "manual" };
    }
    if (index === 0) {
      const open = opts.startedAt <= now;
      prevAt = opts.startedAt;
      return { weekId: week.id, number: week.number, open, opensAt: open ? null : opts.startedAt, source: "default" };
    }
    if (opts.autoUnlock && prevAt) {
      const at: Date = new Date(prevAt.getTime() + WEEK_MS);
      const open = at <= now;
      prevAt = at;
      return { weekId: week.id, number: week.number, open, opensAt: open ? null : at, source: "auto" };
    }
    prevAt = null;
    return { weekId: week.id, number: week.number, open: false, opensAt: null, source: "default" };
  });
  return states;
}

/** Запись ученика на курс вместе со всем, что нужно для расчёта доступа. */
export async function loadEnrollmentAccess(userId: string, courseId: string) {
  const enrollment = await db.enrollment.findUnique({
    where: { userId_courseId: { userId, courseId } },
    include: {
      weekAccess: true,
      course: { select: { id: true, autoUnlock: true, isPublished: true, weeks: { select: { id: true, number: true } } } },
    },
  });
  if (!enrollment || !enrollment.course.isPublished) return null;
  const states = computeWeekStates(enrollment.course.weeks, {
    startedAt: enrollment.startedAt,
    autoUnlock: enrollment.course.autoUnlock,
    overrides: enrollment.weekAccess,
  });
  return { enrollment, states };
}

/** Открыта ли неделя пользователю. Админ видит всё. */
export async function canAccessWeek(user: SessionUser, weekId: string): Promise<boolean> {
  if (user.role === "ADMIN") return true;
  const week = await db.week.findUnique({ where: { id: weekId }, select: { courseId: true } });
  if (!week) return false;
  const access = await loadEnrollmentAccess(user.id, week.courseId);
  return !!access?.states.find((s) => s.weekId === weekId)?.open;
}

export async function canAccessLesson(user: SessionUser, lessonId: string): Promise<boolean> {
  const lesson = await db.lesson.findUnique({ where: { id: lessonId }, select: { day: { select: { weekId: true } } } });
  if (!lesson) return false;
  return canAccessWeek(user, lesson.day.weekId);
}
