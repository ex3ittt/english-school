import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmSubmit } from "@/components/admin/bits";
import s from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/media";
import { DAY_FULL } from "@/lib/student";
import { deleteLessonAction } from "../actions";
import { BlocksEditor, LessonForm, TeacherVideoRow } from "./LessonEditor";

export const metadata: Metadata = { title: "Урок" };

export default async function LessonAdmin({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [lesson, teachers] = await Promise.all([
    db.lesson.findUnique({
      where: { id },
      include: {
        videos: true,
        blocks: { orderBy: { sortOrder: "asc" } },
        day: { include: { week: { include: { course: { select: { id: true, title: true } } } } } },
      },
    }),
    db.teacher.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!lesson) notFound();
  const { week } = lesson.day;

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <nav className={s.crumbs}>
            <Link href="/admin/courses">Курсы</Link> /<Link href={`/admin/courses/${week.course.id}`}>{week.course.title}</Link> /
            <Link href={`/admin/courses/${week.course.id}/weeks/${week.id}`}>Неделя {week.number}</Link> /
            <span>{DAY_FULL[lesson.day.dayOfWeek - 1]}</span>
          </nav>
          <h1 className={s.title}>{lesson.title}</h1>
        </div>
        <form action={deleteLessonAction.bind(null, lesson.id)}>
          <ConfirmSubmit message={`Удалить урок «${lesson.title}» вместе с видео и блоками?`}>Удалить урок</ConfirmSubmit>
        </form>
      </header>

      <div className={s.colsWide}>
        <div className={s.stack}>
          <section className={`paper ${s.panel}`}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Видео урока по преподавателям</h2>
            </div>
            <p className={s.muted} style={{ marginBottom: 16 }}>
              Ученик выбирает преподавателя вкладкой и смотрит его версию. Загрузите файл или вставьте ссылку Vimeo / Kinescope.
            </p>
            {teachers.length === 0 ? (
              <p className={s.empty}>
                Сначала добавьте преподавателей в разделе <Link href="/admin/teachers">«Преподаватели»</Link>.
              </p>
            ) : (
              teachers.map((t) => {
                const v = lesson.videos.find((x) => x.teacherId === t.id) ?? null;
                return (
                  <TeacherVideoRow
                    key={t.id}
                    lessonId={lesson.id}
                    teacher={{ id: t.id, name: t.name, photo: imageUrl(t.photoKey) }}
                    video={
                      v
                        ? {
                            id: v.id,
                            provider: v.provider,
                            url: v.videoUrl,
                            poster: imageUrl(v.posterKey),
                            durationSec: v.durationSec,
                          }
                        : null
                    }
                  />
                );
              })
            )}
          </section>

          <section className={`paper ${s.panel}`}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Блоки урока</h2>
            </div>
            <BlocksEditor
              lessonId={lesson.id}
              blocks={lesson.blocks.map((b) => ({
                id: b.id,
                type: b.type,
                title: b.title,
                text: b.text,
                videoProvider: b.videoProvider,
                videoUrl: b.videoUrl,
                hasVideo: !!(b.videoKey || b.videoUrl),
                poster: imageUrl(b.posterKey),
                fileName: b.fileName,
                fileSize: b.fileSize,
                hasFile: !!b.fileKey,
              }))}
            />
          </section>
        </div>

        <section className={`paper ${s.panel}`}>
          <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
            Урок
          </h2>
          <LessonForm lessonId={lesson.id} title={lesson.title} summary={lesson.summary} />
          <p className={s.muted} style={{ marginTop: 16 }}>
            Посмотреть глазами ученика:{" "}
            <Link href={`/course/${week.course.id}/week/${week.number}?day=${lesson.day.dayOfWeek}`}>открыть день</Link>
          </p>
        </section>
      </div>
    </>
  );
}
