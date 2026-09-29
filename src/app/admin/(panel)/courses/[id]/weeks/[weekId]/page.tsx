import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/admin/bits";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { DAY_FULL } from "@/lib/student";
import { addLessonAction, updateDayAction } from "../../../actions";
import { LessonsOrder } from "./LessonsOrder";
import w from "./week.module.css";

export const metadata: Metadata = { title: "Неделя" };

export default async function WeekAdmin({ params }: { params: Promise<{ id: string; weekId: string }> }) {
  await requireAdmin();
  const { id, weekId } = await params;
  const week = await db.week.findUnique({
    where: { id: weekId },
    include: {
      course: { select: { id: true, title: true } },
      days: {
        orderBy: { dayOfWeek: "asc" },
        include: {
          lessons: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, _count: { select: { videos: true, blocks: true } } },
          },
        },
      },
    },
  });
  if (!week || week.course.id !== id) notFound();

  const [prev, next] = await Promise.all([
    db.week.findFirst({ where: { courseId: id, number: week.number - 1 }, select: { id: true } }),
    db.week.findFirst({ where: { courseId: id, number: week.number + 1 }, select: { id: true } }),
  ]);

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <nav className={s.crumbs}>
            <Link href="/admin/courses">Курсы</Link> / <Link href={`/admin/courses/${id}`}>{week.course.title}</Link> /
          </nav>
          <h1 className={s.title}>
            Неделя {week.number}
            {week.title ? `: ${week.title}` : ""}
          </h1>
          <p className={s.subtitle}>Уроки внутри дня можно менять местами. Пустые дни ученик видит неактивными.</p>
        </div>
        <div className={s.actions}>
          {prev ? (
            <Link href={`/admin/courses/${id}/weeks/${prev.id}`} className={ui.onWood}>
              ← Неделя {week.number - 1}
            </Link>
          ) : null}
          {next ? (
            <Link href={`/admin/courses/${id}/weeks/${next.id}`} className={ui.onWood}>
              Неделя {week.number + 1} →
            </Link>
          ) : null}
        </div>
      </header>

      <div className={w.days}>
        {week.days.map((day) => (
          <section key={day.id} className={`paper ${s.panel} ${w.day}`}>
            <div className={w.dayHead}>
              <h2 className={s.panelTitle}>{DAY_FULL[day.dayOfWeek - 1]}</h2>
              <span className={s.muted}>{day.lessons.length || "нет"} ур.</span>
            </div>
            <form action={updateDayAction.bind(null, day.id)} className={w.dayTitle}>
              <input
                className={ui.input}
                name="title"
                defaultValue={day.title}
                placeholder="Подпись дня (необязательно)"
                aria-label="Подпись дня"
              />
              <SubmitButton variant="secondary" small pendingText="…">
                OK
              </SubmitButton>
            </form>

            {day.lessons.length ? (
              <LessonsOrder
                lessons={day.lessons.map((l) => ({
                  id: l.id,
                  title: l.title,
                  videos: l._count.videos,
                  blocks: l._count.blocks,
                }))}
              />
            ) : null}

            <form action={addLessonAction.bind(null, day.id)} className={w.add}>
              <input className={ui.input} name="title" placeholder="Название урока" aria-label="Название нового урока" />
              <SubmitButton variant="secondary" small pendingText="…">
                + Урок
              </SubmitButton>
            </form>
          </section>
        ))}
      </div>
    </>
  );
}
