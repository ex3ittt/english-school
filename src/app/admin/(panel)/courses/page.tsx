import type { Metadata } from "next";
import { CoursesOrder } from "./CoursesOrder";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { SubmitButton } from "@/components/admin/bits";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { createCourseAction } from "./actions";

export const metadata: Metadata = { title: "Курсы" };

export default async function CoursesAdmin() {
  await requireAdmin();
  const courses = await db.course.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      level: true,
      levelCode: true,
      isMain: true,
      isPublished: true,
      autoUnlock: true,
      _count: { select: { weeks: true, enrollments: true } },
    },
  });

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <h1 className={s.title}>Курсы и уроки</h1>
          <p className={s.subtitle}>Порядок здесь — это порядок на полке у ученика. Перетащите курс за ручку слева.</p>
        </div>
      </header>

      <div className={s.colsWide}>
        <section className={`paper ${s.panel}`}>
          {courses.length === 0 ? <p className={s.empty}>Курсов пока нет.</p> : <CoursesOrder courses={courses} />}
        </section>

        <section className={`paper ${s.panel}`}>
          <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
            Новый курс
          </h2>
          <form action={createCourseAction} className={s.form}>
            <label className={ui.field}>
              <span className={ui.label}>Название</span>
              <input className={ui.input} name="title" placeholder="Например, «Разговорный английский»" required />
            </label>
            <p className={s.muted}>Курс создаётся скрытым. Опубликуйте его, когда добавите недели и уроки.</p>
            <div>
              <SubmitButton pendingText="Создаём…">Создать курс</SubmitButton>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}
