import type { Metadata } from "next";
import Link from "next/link";
import { CourseCover } from "@/components/CourseCover";
import { ArrowRightIcon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { requireUser } from "@/lib/auth/guards";
import { imageUrl } from "@/lib/media";
import { DAY_SHORT, getCourseForUser, getShelf, pluralRu } from "@/lib/student";
import s from "./shelf.module.css";

export const metadata: Metadata = { title: "Мои курсы" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("ru-RU", { hour: "numeric", timeZone: "Europe/Moscow" }).format(new Date()));
  if (h < 5) return "Доброй ночи";
  if (h < 12) return "Доброе утро";
  if (h < 18) return "Добрый день";
  return "Добрый вечер";
}

export default async function CoursesPage() {
  const user = await requireUser();
  const { main, others } = await getShelf(user);
  const mainData = main ? await getCourseForUser(user, main.id) : null;

  const rows: (typeof others)[] = [];
  for (let i = 0; i < others.length; i += 3) rows.push(others.slice(i, i + 3));

  return (
    <main className={s.page}>
      <header className={s.head}>
        <p className={s.hello}>
          {greeting()}, {user.name.split(" ")[0]}
        </p>
        <h1 className={s.title}>Мои курсы</h1>
      </header>

      <div className={s.layout}>
        {main && mainData ? (
          <section className={`paper ${s.main}`} aria-labelledby="main-course">
            <div className={s.spine} aria-hidden="true" />
            {main.coverKey ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={s.mainCover} src={imageUrl(main.coverKey)!} alt="" />
            ) : null}
            <div className={s.mainBody}>
              <div className={s.mainTop}>
                <span className={s.levelName}>{main.level || "Основной курс"}</span>
                <span className={s.levelCode}>{main.levelCode}</span>
              </div>
              <h2 id="main-course" className={s.mainTitle}>
                {main.title}
              </h2>
              {main.description ? <p className={s.mainText}>{main.description}</p> : null}

              <div className={s.progress}>
                <div className={s.progressHead}>
                  <span>
                    Пройдено {mainData.completed} из {mainData.total}{" "}
                    {pluralRu(mainData.total, "урока", "уроков", "уроков")}
                  </span>
                  <strong>{mainData.total ? Math.round((mainData.completed / mainData.total) * 100) : 0}%</strong>
                </div>
                <div
                  className={s.track}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={mainData.total}
                  aria-valuenow={mainData.completed}
                  aria-label="Прогресс курса"
                >
                  <span style={{ width: `${mainData.total ? (mainData.completed / mainData.total) * 100 : 0}%` }} />
                </div>
                <p className={s.weeksLine}>
                  {mainData.weeks.map((w) => (
                    <span
                      key={w.id}
                      className={w.isDone ? s.wDone : w.open ? s.wOpen : s.wClosed}
                      title={`Неделя ${w.number}`}
                    />
                  ))}
                </p>
              </div>

              <div className={s.actions}>
                {mainData.next ? (
                  <Link
                    href={`/course/${main.id}/week/${mainData.next.weekNumber}?day=${mainData.next.dayOfWeek}`}
                    className={ui.primary}
                  >
                    Продолжить: неделя {mainData.next.weekNumber}, {DAY_SHORT[mainData.next.dayOfWeek - 1]}
                    <ArrowRightIcon size={16} />
                  </Link>
                ) : null}
                <Link href={`/course/${main.id}`} className={ui.secondary}>
                  Открыть курс
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <section className={`paper ${s.main} ${s.empty}`}>
            <div className={s.mainBody}>
              <h2 className={s.mainTitle}>Курсов пока нет</h2>
              <p className={s.mainText}>
                Как только школа откроет вам доступ, курс появится здесь. Если оплата уже прошла, напишите куратору.
              </p>
            </div>
          </section>
        )}

        <section className={s.shelf} aria-label="Другие курсы">
          <h2 className={s.shelfTitle}>Ещё курсы школы</h2>
          {rows.length === 0 ? <p className={s.shelfEmpty}>Других курсов пока нет.</p> : null}
          {rows.map((row, r) => (
            <div key={r} className={s.row}>
              {row.map((c, i) => {
                const cover = (
                  <CourseCover
                    title={c.title}
                    level={c.level}
                    levelCode={c.levelCode}
                    coverKey={c.coverKey}
                    variant={r * 3 + i + 1}
                    locked={!c.available}
                  />
                );
                return c.available ? (
                  <Link key={c.id} href={`/course/${c.id}`} className={s.book}>
                    {cover}
                    <span className={s.bookTitle}>{c.title}</span>
                    <span className={s.bookMeta}>
                      {c.total ? `${c.completed} из ${c.total} уроков` : "Скоро старт"}
                    </span>
                  </Link>
                ) : (
                  <div key={c.id} className={`${s.book} ${s.bookLocked}`} aria-disabled="true">
                    {cover}
                    <span className={s.bookTitle}>{c.title}</span>
                    <span className={s.bookMeta}>Недоступно · спросите куратора</span>
                  </div>
                );
              })}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
