import Link from "next/link";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { requireAdmin } from "@/lib/auth/guards";
import { dateTime, relativeDays, STALE_DAYS } from "@/lib/admin-format";
import { db } from "@/lib/db";
import { DAY_SHORT } from "@/lib/student";

export default async function AdminHome() {
  await requireAdmin();
  const weekAgo = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const [students, active, blocked, views, stale, recent, courses] = await Promise.all([
    db.user.count({ where: { role: "STUDENT" } }),
    db.user.count({ where: { role: "STUDENT", isBlocked: false, lastSeenAt: { gte: weekAgo } } }),
    db.user.count({ where: { role: "STUDENT", isBlocked: true } }),
    db.progress.count({ where: { completedAt: { gte: weekAgo }, user: { role: "STUDENT" } } }),
    db.user.findMany({
      where: { role: "STUDENT", isBlocked: false, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: weekAgo } }] },
      orderBy: { lastSeenAt: { sort: "asc", nulls: "first" } },
      take: 12,
      select: { id: true, name: true, email: true, lastSeenAt: true, enrollments: { select: { course: { select: { title: true } } } } },
    }),
    db.progress.findMany({
      where: { user: { role: "STUDENT" } },
      orderBy: { completedAt: "desc" },
      take: 14,
      select: {
        id: true,
        completedAt: true,
        user: { select: { id: true, name: true } },
        lesson: {
          select: {
            title: true,
            day: { select: { dayOfWeek: true, week: { select: { number: true, course: { select: { title: true } } } } } },
          },
        },
      },
    }),
    db.course.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        _count: { select: { enrollments: true } },
        weeks: { select: { days: { select: { lessons: { select: { id: true } } } } } },
      },
    }),
  ]);

  // Средний прогресс по курсам
  const courseStats = await Promise.all(
    courses.map(async (c) => {
      const lessonIds = c.weeks.flatMap((w) => w.days.flatMap((d) => d.lessons.map((l) => l.id)));
      const done = lessonIds.length
        ? await db.progress.count({
            where: { lessonId: { in: lessonIds }, user: { role: "STUDENT", enrollments: { some: { courseId: c.id } } } },
          })
        : 0;
      const avg = c._count.enrollments && lessonIds.length ? done / (c._count.enrollments * lessonIds.length) : 0;
      return { id: c.id, title: c.title, students: c._count.enrollments, lessons: lessonIds.length, avg };
    }),
  );

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <h1 className={s.title}>Обзор</h1>
          <p className={s.subtitle}>Кто учится, что смотрят и кто пропал.</p>
        </div>
        <div className={s.actions}>
          <Link href="/admin/students/new" className={ui.primary}>
            Новый ученик
          </Link>
        </div>
      </header>

      <section className={s.stats} aria-label="Статистика">
        <div className={s.stat}>
          <strong>{students}</strong>
          <span>учеников всего{blocked ? `, ${blocked} заблокировано` : ""}</span>
        </div>
        <div className={s.stat}>
          <strong>{active}</strong>
          <span>заходили за {STALE_DAYS} дней</span>
        </div>
        <div className={s.stat}>
          <strong>{views}</strong>
          <span>уроков отмечено за {STALE_DAYS} дней</span>
        </div>
        <div className={s.stat}>
          <strong>{stale.length}</strong>
          <span>давно не заходили</span>
        </div>
      </section>

      <div className={s.cols}>
        <section className={`paper ${s.panel}`}>
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>Последние просмотры</h2>
          </div>
          {recent.length === 0 ? (
            <p className={s.empty}>Пока никто не отметил ни одного урока.</p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Ученик</th>
                    <th>Урок</th>
                    <th>Когда</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td className={s.cellMain}>
                        <Link href={`/admin/students/${r.user.id}`}>{r.user.name}</Link>
                      </td>
                      <td>
                        <div className={s.cellMain}>
                          <span>{r.lesson.title}</span>
                          <span className={s.cellSub}>
                            {r.lesson.day.week.course.title} · неделя {r.lesson.day.week.number},{" "}
                            {DAY_SHORT[r.lesson.day.dayOfWeek - 1]}
                          </span>
                        </div>
                      </td>
                      <td className={s.num}>{dateTime(r.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div>
          <section className={`paper ${s.panel}`}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Давно не заходили</h2>
              <span className={s.muted}>больше {STALE_DAYS} дней</span>
            </div>
            {stale.length === 0 ? (
              <p className={s.empty}>Все активные ученики заходили на этой неделе.</p>
            ) : (
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <tbody>
                    {stale.map((u) => (
                      <tr key={u.id}>
                        <td>
                          <div className={s.cellMain}>
                            <Link href={`/admin/students/${u.id}`}>{u.name}</Link>
                            <span className={s.cellSub}>{u.enrollments.map((e) => e.course.title).join(", ") || "без курсов"}</span>
                          </div>
                        </td>
                        <td className={s.num}>{relativeDays(u.lastSeenAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={`paper ${s.panel}`}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Курсы</h2>
            </div>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Курс</th>
                    <th>Учеников</th>
                    <th>Средний прогресс</th>
                  </tr>
                </thead>
                <tbody>
                  {courseStats.map((c) => (
                    <tr key={c.id}>
                      <td className={s.cellMain}>
                        <Link href={`/admin/courses/${c.id}`}>{c.title}</Link>
                      </td>
                      <td className={s.num}>{c.students}</td>
                      <td className={s.num}>
                        <span className={s.miniBar}>
                          <span style={{ width: `${Math.round(c.avg * 100)}%` }} />
                        </span>
                        {Math.round(c.avg * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
