import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/bits";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { computeWeekStates } from "@/lib/access";
import { dateTime, relativeDays } from "@/lib/admin-format";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { DAY_SHORT, formatDate } from "@/lib/student";
import { enrollAction, setBlockedAction, unenrollAction } from "../actions";
import { EnrollmentForm, PasswordTools, ProfileForm, WeekAccessSelect } from "./StudentForms";

export const metadata: Metadata = { title: "Ученик" };

export default async function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    include: {
      enrollments: {
        orderBy: { createdAt: "asc" },
        include: {
          weekAccess: true,
          course: {
            select: {
              id: true,
              title: true,
              autoUnlock: true,
              weeks: {
                orderBy: { number: "asc" },
                select: { id: true, number: true, title: true, days: { select: { lessons: { select: { id: true } } } } },
              },
            },
          },
        },
      },
    },
  });
  if (!user) notFound();

  const [done, recent, allCourses] = await Promise.all([
    db.progress.findMany({ where: { userId: id }, select: { lessonId: true } }),
    db.progress.findMany({
      where: { userId: id },
      orderBy: { completedAt: "desc" },
      take: 10,
      select: {
        id: true,
        completedAt: true,
        lesson: { select: { title: true, day: { select: { dayOfWeek: true, week: { select: { number: true, course: { select: { title: true } } } } } } } },
      },
    }),
    db.course.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true } }),
  ]);
  const doneSet = new Set(done.map((d) => d.lessonId));
  const enrolledIds = new Set(user.enrollments.map((e) => e.courseId));
  const available = allCourses.filter((c) => !enrolledIds.has(c.id));
  const isSelf = admin.id === user.id;

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <nav className={s.crumbs}>
            <Link href="/admin/students">Ученики</Link> /
          </nav>
          <h1 className={s.title}>{user.name}</h1>
          <p className={s.subtitle}>
            {user.email} · заходил {relativeDays(user.lastSeenAt)} · в школе с {formatDate(user.createdAt)}
            {user.role === "ADMIN" ? " · администратор" : ""}
          </p>
        </div>
        <div className={s.actions}>
          {user.isBlocked ? <span className={s.badgeRed}>Заблокирован</span> : null}
          {isSelf ? null : (
            <form action={setBlockedAction.bind(null, user.id, !user.isBlocked)}>
              {user.isBlocked ? (
                <SubmitButton variant="secondary" small pendingText="…">
                  Разблокировать
                </SubmitButton>
              ) : (
                <ConfirmSubmit message={`Заблокировать ${user.name}? Ученик сразу потеряет доступ к кабинету.`}>
                  Заблокировать
                </ConfirmSubmit>
              )}
            </form>
          )}
        </div>
      </header>

      <div className={s.colsWide}>
        <div className={s.stack}>
          {user.enrollments.length === 0 ? (
            <section className={`paper ${s.panel}`}>
              <p className={s.empty}>Ученик пока не записан ни на один курс.</p>
            </section>
          ) : null}

          {user.enrollments.length > 0 ? (
            <section className={`paper ${s.panel}`}>
              {user.enrollments.map((e) => {
                const states = computeWeekStates(e.course.weeks, {
                  startedAt: e.startedAt,
                  autoUnlock: e.course.autoUnlock,
                  overrides: e.weekAccess,
                });
                const manual = new Map(e.weekAccess.map((a) => [a.weekId, a.mode]));
                const lessonIds = e.course.weeks.flatMap((w) => w.days.flatMap((d) => d.lessons.map((l) => l.id)));
                const completed = lessonIds.filter((l) => doneSet.has(l)).length;
                return (
                  <div key={e.id} className={s.enrollment}>
                    <div className={s.panelHead}>
                      <div>
                        <h2 className={s.panelTitle}>{e.course.title}</h2>
                        <p className={s.muted}>
                          <span className={s.miniBar}>
                            <span style={{ width: `${lessonIds.length ? (completed / lessonIds.length) * 100 : 0}%` }} />
                          </span>
                          {completed} из {lessonIds.length} уроков
                          {e.course.autoUnlock ? " · автооткрытие недель включено" : " · недели открываются вручную"}
                        </p>
                      </div>
                      <form action={unenrollAction.bind(null, e.id)}>
                        <ConfirmSubmit message={`Убрать доступ к курсу «${e.course.title}»? Прогресс ученика сохранится.`}>
                          Убрать с курса
                        </ConfirmSubmit>
                      </form>
                    </div>

                    <EnrollmentForm
                      enrollmentId={e.id}
                      curatorName={e.curatorName}
                      curatorSchedule={e.curatorSchedule}
                      startedAt={e.startedAt.toISOString().slice(0, 10)}
                    />

                    <h3 className={ui.label} style={{ margin: "22px 0 10px" }}>
                      Доступ к неделям
                    </h3>
                    <div className={s.weeksGrid}>
                      {e.course.weeks.map((w) => {
                        const st = states.find((x) => x.weekId === w.id)!;
                        const ids = w.days.flatMap((d) => d.lessons.map((l) => l.id));
                        const wDone = ids.filter((l) => doneSet.has(l)).length;
                        return (
                          <div key={w.id} className={`${s.weekBox} ${st.open ? s.weekBoxOpen : ""}`}>
                            <div className={s.weekBoxHead}>
                              <span>Неделя {w.number}</span>
                              {st.open ? <span className={s.badge}>открыта</span> : <span className={s.badgeOutline}>закрыта</span>}
                            </div>
                            <span className={s.muted}>
                              {wDone} из {ids.length} уроков
                              {!st.open && st.opensAt ? ` · откроется ${formatDate(st.opensAt)}` : ""}
                            </span>
                            <WeekAccessSelect enrollmentId={e.id} weekId={w.id} value={manual.get(w.id) ?? "AUTO"} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </section>
          ) : null}

          {available.length > 0 ? (
            <section className={`paper ${s.panel}`}>
              <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
                Записать на курс
              </h2>
              <form action={enrollAction.bind(null, user.id)} className={s.inline}>
                <label className={ui.field}>
                  <span className={ui.label}>Курс</span>
                  <select name="courseId" className={ui.input} required>
                    {available.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </label>
                <SubmitButton variant="secondary">Записать</SubmitButton>
              </form>
            </section>
          ) : null}
        </div>

        <div className={s.stack}>
          <section className={`paper ${s.panel}`}>
            <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
              Профиль
            </h2>
            <ProfileForm userId={user.id} name={user.name} email={user.email} />
          </section>

          <section className={`paper ${s.panel}`}>
            <h2 className={s.panelTitle} style={{ marginBottom: 6 }}>
              Пароль
            </h2>
            <p className={s.muted} style={{ marginBottom: 14 }}>
              Новый пароль выйдет из кабинета на всех устройствах ученика.
            </p>
            <PasswordTools userId={user.id} />
          </section>

          <section className={`paper ${s.panel}`}>
            <h2 className={s.panelTitle} style={{ marginBottom: 10 }}>
              Последние просмотры
            </h2>
            {recent.length === 0 ? (
              <p className={s.empty}>Ещё ничего не отмечено.</p>
            ) : (
              <table className={s.table}>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className={s.cellMain}>
                          <span>{r.lesson.title}</span>
                          <span className={s.cellSub}>
                            Неделя {r.lesson.day.week.number}, {DAY_SHORT[r.lesson.day.dayOfWeek - 1]} ·{" "}
                            {r.lesson.day.week.course.title}
                          </span>
                        </div>
                      </td>
                      <td className={s.num}>{dateTime(r.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
