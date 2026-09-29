import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LockIcon } from "@/components/icons";
import { requireUser } from "@/lib/auth/guards";
import { imageUrl } from "@/lib/media";
import { DAY_FULL, formatDate, getCourseForUser, getDayContent, pluralRu } from "@/lib/student";
import p from "../../pages.module.css";
import { DayTabs } from "./DayTabs";
import { DayView } from "./DayView";

type Props = { params: Promise<{ id: string; n: string }>; searchParams: Promise<{ day?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { n } = await params;
  return { title: `Неделя ${n}` };
}

export default async function WeekPage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id, n } = await params;
  const data = await getCourseForUser(user, id);
  if (!data) notFound();

  const week = data.weeks.find((w) => w.number === Number(n));
  if (!week) notFound();

  // Закрытая неделя: сервер не отдаёт ни уроков, ни видео.
  if (!week.open) {
    return (
      <section className={`paper ${p.sheet} ${p.locked}`}>
        <span className={p.lockBadge}>
          <LockIcon size={26} />
        </span>
        <h1 className={p.h2}>Неделя {week.number} пока закрыта</h1>
        <p className={p.muted}>
          {week.opensAt
            ? `Она откроется автоматически ${formatDate(week.opensAt)}.`
            : "Её откроет куратор, когда вы пройдёте предыдущие уроки."}
        </p>
      </section>
    );
  }

  const withLessons = week.days.filter((d) => d.lessons.length > 0);
  const requested = Number((await searchParams).day);
  const day =
    week.days.find((d) => d.dayOfWeek === requested) ??
    withLessons.find((d) => d.lessons.some((l) => !l.done)) ??
    withLessons[0] ??
    week.days[0];

  // Фиксируем день в адресе: после отметки «просмотрено» страница не перескочит на другой день.
  if (day && day.dayOfWeek !== requested) redirect(`/course/${id}/week/${week.number}?day=${day.dayOfWeek}`);

  const content = day && day.lessons.length ? await getDayContent(day.id, user.id) : null;

  return (
    <>
      <header className={p.head}>
        <p className={p.kicker}>
          Неделя {week.number} · {week.completed} из {week.total} {pluralRu(week.total, "урока", "уроков", "уроков")}
        </p>
        <h1 className={p.h1}>{week.title || `Неделя ${week.number}`}</h1>
      </header>

      <DayTabs
        courseId={id}
        weekNumber={week.number}
        active={day?.dayOfWeek ?? 0}
        days={[1, 2, 3, 4, 5, 6, 7].map((dow) => {
          const d = week.days.find((x) => x.dayOfWeek === dow);
          const lessons = d?.lessons ?? [];
          return { dayOfWeek: dow, hasLessons: lessons.length > 0, done: lessons.length > 0 && lessons.every((l) => l.done) };
        })}
      />

      <section className={`paper ${p.sheet} ${p.sheetTabbed}`} aria-label={day ? DAY_FULL[day.dayOfWeek - 1] : undefined}>
        {content ? (
          <DayView
            key={day!.id}
            courseId={id}
            dayLabel={DAY_FULL[day!.dayOfWeek - 1] + (day!.title ? ` · ${day!.title}` : "")}
            preferredTeacherId={data.enrollment?.preferredTeacherId ?? null}
            teachers={content.teachers.map((t) => ({ id: t.id, name: t.name, bio: t.bio, photo: imageUrl(t.photoKey) }))}
            lessons={content.lessons}
          />
        ) : (
          <div className={p.emptyDay}>
            <h2 className={p.h2}>В этот день уроков нет</h2>
            <p className={p.muted}>Можно отдохнуть или вернуться к урокам, которые ещё не отмечены как просмотренные.</p>
          </div>
        )}
      </section>
    </>
  );
}
