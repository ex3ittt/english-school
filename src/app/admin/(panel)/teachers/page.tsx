import type { Metadata } from "next";
import s from "@/components/admin/admin.module.css";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/media";
import { NewTeacherForm, TeachersList } from "./TeacherForms";

export const metadata: Metadata = { title: "Преподаватели" };

export default async function TeachersAdmin() {
  await requireAdmin();
  const teachers = await db.teacher.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { videos: true } } },
  });

  return (
    <>
      <header className={s.pageHead}>
        <div>
          <h1 className={s.title}>Преподаватели</h1>
          <p className={s.subtitle}>Порядок здесь — порядок вкладок с именами в уроке. Видео привязываются в редакторе урока.</p>
        </div>
      </header>
      <div className={s.colsWide}>
        <section className={`paper ${s.panel}`}>
          {teachers.length === 0 ? (
            <p className={s.empty}>Преподавателей пока нет.</p>
          ) : (
            <TeachersList
              teachers={teachers.map((t) => ({
                id: t.id,
                name: t.name,
                bio: t.bio,
                photo: imageUrl(t.photoKey),
                videos: t._count.videos,
              }))}
            />
          )}
        </section>
        <section className={`paper ${s.panel}`}>
          <h2 className={s.panelTitle} style={{ marginBottom: 14 }}>
            Новый преподаватель
          </h2>
          <NewTeacherForm />
        </section>
      </div>
    </>
  );
}
