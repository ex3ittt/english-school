import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/bits";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/media";
import { addWeekAction, deleteCourseAction, deleteWeekAction, updateWeekAction } from "../actions";
import { CourseCoverEditor, CourseForm } from "./CourseForms";

export const metadata: Metadata = { title: "Курс" };

export default async function CourseAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const course = await db.course.findUnique({
    where: { id },
    include: {
      _count: { select: { enrollments: true } },
      weeks: {
        orderBy: { number: "asc" },
        include: { days: { select: { dayOfWeek: true, _count: { select: { lessons: true } } } } },
      },
    },
  });
  if (!course) notFound();

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <nav className={s.crumbs}>
            <Link href="/admin/courses">Курсы</Link> /
          </nav>
          <h1 className={s.title}>{course.title}</h1>
          <p className={s.subtitle}>
            {course.isPublished ? "Опубликован" : "Скрыт от учеников"} · {course._count.enrollments} учеников ·{" "}
            {course.weeks.length} нед.
          </p>
        </div>
        <div className={s.actions}>
          <Link href={`/course/${course.id}`} className={ui.onWood}>
            Посмотреть как ученик
          </Link>
        </div>
      </header>

      <div className={s.colsWide}>
        <section className={`paper ${s.panel}`}>
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>Недели</h2>
            <form action={addWeekAction.bind(null, course.id)}>
              <SubmitButton small pendingText="Добавляем…">
                Добавить неделю
              </SubmitButton>
            </form>
          </div>
          {course.weeks.length === 0 ? (
            <p className={s.empty}>Недель пока нет. Добавьте первую — дни с понедельника по воскресенье создадутся сами.</p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>№</th>
                    <th>Тема недели</th>
                    <th>Уроков</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {course.weeks.map((w) => {
                    const lessons = w.days.reduce((a, d) => a + d._count.lessons, 0);
                    return (
                      <tr key={w.id}>
                        <td className={s.num}>
                          <strong>{w.number}</strong>
                        </td>
                        <td>
                          <form action={updateWeekAction.bind(null, w.id)} className={s.inline}>
                            <input
                              className={`${ui.input}`}
                              style={{ minHeight: 38 }}
                              name="title"
                              defaultValue={w.title}
                              placeholder={`Неделя ${w.number}`}
                              aria-label={`Тема недели ${w.number}`}
                            />
                            <SubmitButton variant="secondary" small pendingText="…">
                              OK
                            </SubmitButton>
                          </form>
                        </td>
                        <td className={s.num}>{lessons}</td>
                        <td>
                          <div className={s.actions} style={{ flexWrap: "nowrap" }}>
                            <Link href={`/admin/courses/${course.id}/weeks/${w.id}`} className={`${ui.primary} ${ui.small}`}>
                              Дни и уроки
                            </Link>
                            <form action={deleteWeekAction.bind(null, w.id)}>
                              <ConfirmSubmit
                                message={`Удалить неделю ${w.number} со всеми уроками (${lessons})? Это действие нельзя отменить.`}
                              >
                                Удалить
                              </ConfirmSubmit>
                            </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className={s.stack}>
          <section className={`paper ${s.panel}`}>
            <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
              Настройки
            </h2>
            <CourseForm
              courseId={course.id}
              values={{
                title: course.title,
                level: course.level,
                levelCode: course.levelCode,
                description: course.description,
                isMain: course.isMain,
                isPublished: course.isPublished,
                autoUnlock: course.autoUnlock,
              }}
            />
          </section>

          <section className={`paper ${s.panel}`}>
            <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
              Обложка
            </h2>
            <CourseCoverEditor courseId={course.id} cover={imageUrl(course.coverKey)} />
          </section>

          <section className={`paper ${s.panel}`}>
            <h2 className={s.panelTitle} style={{ marginBottom: 8 }}>
              Удаление
            </h2>
            <p className={s.muted} style={{ marginBottom: 14 }}>
              Удалятся все недели, уроки, видео и прогресс учеников по этому курсу.
            </p>
            <form action={deleteCourseAction.bind(null, course.id)}>
              <ConfirmSubmit message={`Удалить курс «${course.title}» целиком? Отменить будет нельзя.`}>Удалить курс</ConfirmSubmit>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
