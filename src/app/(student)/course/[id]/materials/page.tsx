import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DownloadIcon, FileIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { DAY_SHORT, getCourseForUser } from "@/lib/student";
import p from "../pages.module.css";

export const metadata: Metadata = { title: "Материалы" };

export default async function MaterialsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getCourseForUser(user, id);
  if (!data) notFound();

  // Только файлы из открытых недель.
  const openWeekIds = data.weeks.filter((w) => w.open).map((w) => w.id);
  const files = await db.lessonBlock.findMany({
    where: { type: "FILE", lesson: { day: { weekId: { in: openWeekIds } } } },
    select: {
      id: true,
      title: true,
      fileName: true,
      lesson: { select: { title: true, day: { select: { dayOfWeek: true, week: { select: { number: true, title: true } } } } } },
    },
  });

  const byWeek = new Map<number, { title: string; items: typeof files }>();
  for (const f of files) {
    const w = f.lesson.day.week;
    if (!byWeek.has(w.number)) byWeek.set(w.number, { title: w.title, items: [] });
    byWeek.get(w.number)!.items.push(f);
  }
  const groups = [...byWeek.entries()].sort((a, b) => a[0] - b[0]);
  const closed = data.weeks.length - openWeekIds.length;

  return (
    <>
      <header className={p.head}>
        <p className={p.kicker}>Файлы и рабочие листы</p>
        <h1 className={p.h1}>Материалы</h1>
      </header>

      <section className={`paper ${p.sheet}`}>
        {groups.length === 0 ? (
          <p className={p.muted}>В открытых неделях пока нет файлов.</p>
        ) : (
          groups.map(([number, group]) => (
            <div key={number} className={p.matGroup}>
              <h2 className={p.matWeek}>
                <span>Неделя {number}</span>
                {group.title}
              </h2>
              <ul className={p.matList}>
                {group.items
                  .sort((a, b) => a.lesson.day.dayOfWeek - b.lesson.day.dayOfWeek)
                  .map((f) => (
                    <li key={f.id} className={p.matItem}>
                      <FileIcon size={20} className={p.matIcon} />
                      <span className={p.matText}>
                        <a href={`/api/media/file/${f.id}`} className={p.matName} rel="nofollow">
                          {f.fileName ?? f.title}
                        </a>
                        <Link href={`/course/${id}/week/${number}?day=${f.lesson.day.dayOfWeek}`} className={p.matFrom}>
                          {DAY_SHORT[f.lesson.day.dayOfWeek - 1]} · {f.lesson.title}
                        </Link>
                      </span>
                      <a href={`/api/media/file/${f.id}`} className={p.matDl} aria-label="Скачать" rel="nofollow">
                        <DownloadIcon size={18} />
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          ))
        )}
        {closed > 0 ? (
          <p className={p.matNote}>Материалы ещё {closed} закрытых недель появятся здесь, когда недели откроются.</p>
        ) : null}
      </section>
    </>
  );
}
