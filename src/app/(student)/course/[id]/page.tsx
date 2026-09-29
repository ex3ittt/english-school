import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRightIcon, CheckIcon, LockIcon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { requireUser } from "@/lib/auth/guards";
import { DAY_FULL, formatDate, getCourseForUser, pluralRu } from "@/lib/student";
import p from "./pages.module.css";

export default async function CourseHome({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const data = await getCourseForUser(user, id);
  if (!data) notFound();

  const { course, weeks, next, enrollment } = data;
  const percent = data.total ? Math.round((data.completed / data.total) * 100) : 0;
  const openCount = weeks.filter((w) => w.open).length;
  const upcoming = weeks.find((w) => !w.open && w.opensAt);

  return (
    <>
      <header className={p.head}>
        <p className={p.kicker}>{course.level || "Курс"}</p>
        <h1 className={p.h1}>{course.title}</h1>
        {course.description ? <p className={p.lead}>{course.description}</p> : null}
      </header>

      <div className={p.homeGrid}>
        <section className={`paper ${p.sheet} ${p.nextCard}`}>
          {next ? (
            <>
              <span className={p.cardKicker}>Следующий урок</span>
              <p className={p.nextWhere}>
                Неделя {next.weekNumber} · {DAY_FULL[next.dayOfWeek - 1]}
              </p>
              <h2 className={p.nextTitle}>{next.title}</h2>
              <Link href={`/course/${id}/week/${next.weekNumber}?day=${next.dayOfWeek}`} className={ui.primary}>
                Перейти к уроку <ArrowRightIcon size={16} />
              </Link>
            </>
          ) : data.total === 0 ? (
            <>
              <span className={p.cardKicker}>Скоро старт</span>
              <h2 className={p.nextTitle}>Уроки появятся здесь</h2>
              <p className={p.muted}>Школа ещё готовит программу этого курса. Мы откроем первую неделю, как только она будет готова.</p>
            </>
          ) : (
            <>
              <span className={p.cardKicker}>Все открытые уроки пройдены</span>
              <h2 className={p.nextTitle}>Отличная работа</h2>
              <p className={p.muted}>
                {upcoming?.opensAt
                  ? `Неделя ${upcoming.number} откроется ${formatDate(upcoming.opensAt)}.`
                  : "Новые уроки появятся, когда куратор откроет следующую неделю."}
              </p>
            </>
          )}
        </section>

        <section className={p.stats} aria-label="Прогресс">
          <div className={p.stat}>
            <strong>{percent}%</strong>
            <span>курса пройдено</span>
          </div>
          <div className={p.stat}>
            <strong>
              {data.completed}
              <small>/{data.total}</small>
            </strong>
            <span>{pluralRu(data.total, "урок", "урока", "уроков")} просмотрено</span>
          </div>
          <div className={p.stat}>
            <strong>
              {openCount}
              <small>/{weeks.length}</small>
            </strong>
            <span>{pluralRu(weeks.length, "неделя открыта", "недели открыто", "недель открыто")}</span>
          </div>
          {enrollment ? <p className={p.statNote}>Старт обучения: {formatDate(enrollment.startedAt)}.</p> : null}
          {course.autoUnlock ? <p className={p.statNote}>Новая неделя открывается через 7 дней после предыдущей.</p> : null}
        </section>
      </div>

      <section className={p.weekMap} aria-label="Недели курса">
        <h2 className={p.sectionTitle}>Программа</h2>
        <ol className={p.weekCells}>
          {weeks.map((w) => {
            const inner = (
              <>
                <span className={p.cellNum}>{String(w.number).padStart(2, "0")}</span>
                <span className={p.cellTitle}>{w.title || `Неделя ${w.number}`}</span>
                <span className={p.cellState}>
                  {w.isDone ? (
                    <>
                      <CheckIcon size={14} /> пройдена
                    </>
                  ) : w.open ? (
                    `${w.completed} из ${w.total}`
                  ) : (
                    <>
                      <LockIcon size={14} /> {w.opensAt ? `с ${formatDate(w.opensAt)}` : "закрыта"}
                    </>
                  )}
                </span>
                <span className={p.cellBar}>
                  <span style={{ width: `${w.total ? (w.completed / w.total) * 100 : 0}%` }} />
                </span>
              </>
            );
            return (
              <li key={w.id}>
                {w.open ? (
                  <Link href={`/course/${id}/week/${w.number}`} className={`${p.cell} ${w.isDone ? p.cellDone : ""}`}>
                    {inner}
                  </Link>
                ) : (
                  <span className={`${p.cell} ${p.cellLocked}`}>{inner}</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
