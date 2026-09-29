"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftIcon, CheckIcon, ChevronDownIcon, ClockIcon, HomeIcon, LockIcon, StackIcon } from "@/components/icons";
import s from "./course.module.css";

type WeekItem = { number: number; title: string; open: boolean; isDone: boolean; opensAt: string | null };

type Props = {
  courseId: string;
  courseTitle: string;
  levelCode: string;
  weeks: WeekItem[];
  curator: { name: string; schedule: string } | null;
};

const dateFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" });

export function CourseNav({ courseId, courseTitle, levelCode, weeks, curator }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const base = `/course/${courseId}`;

  // Закрываем выпадающее меню на мобильном после перехода.
  useEffect(() => setOpen(false), [pathname]);

  const weekMatch = pathname.match(/\/week\/(\d+)/);
  const activeWeek = weekMatch ? Number(weekMatch[1]) : null;
  const isHome = pathname === base;
  const isMaterials = pathname.startsWith(`${base}/materials`);
  const currentLabel = isHome ? "Главная" : isMaterials ? "Материалы" : activeWeek ? `Неделя ${activeWeek}` : "Разделы курса";

  return (
    <aside className={s.aside}>
      <Link href="/courses" className={s.back}>
        <ArrowLeftIcon size={15} /> Все курсы
      </Link>
      <div className={s.courseHead}>
        {levelCode ? <span className={s.courseCode}>{levelCode}</span> : null}
        <span className={s.courseName}>{courseTitle}</span>
      </div>

      <div className={s.navWrap}>
      <button
        type="button"
        className={s.navToggle}
        aria-expanded={open}
        aria-controls="course-nav"
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          <small>Раздел</small>
          {currentLabel}
        </span>
        <ChevronDownIcon size={18} className={open ? s.chevUp : undefined} />
      </button>

      <nav id="course-nav" className={`${s.nav} ${open ? s.navOpen : ""}`} aria-label="Разделы курса">
        <Link href={base} className={`${s.navItem} ${isHome ? s.active : ""}`} aria-current={isHome ? "page" : undefined}>
          <HomeIcon size={17} />
          <span>Главная</span>
        </Link>
        <Link
          href={`${base}/materials`}
          className={`${s.navItem} ${isMaterials ? s.active : ""}`}
          aria-current={isMaterials ? "page" : undefined}
        >
          <StackIcon size={17} />
          <span>Материалы</span>
        </Link>

        <div className={s.navDivider}>Недели</div>

        <ol className={s.weekList}>
          {weeks.map((w) => {
            const active = activeWeek === w.number;
            const hint = w.opensAt ? `Откроется ${dateFmt.format(new Date(w.opensAt))}` : "Откроет куратор";
            return (
              <li key={w.number}>
                {w.open ? (
                  <Link
                    href={`${base}/week/${w.number}`}
                    className={`${s.week} ${active ? s.active : ""} ${w.isDone ? s.weekDone : ""}`}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className={s.weekNum}>{String(w.number).padStart(2, "0")}</span>
                    <span className={s.weekText}>
                      <span className={s.weekLabel}>Неделя {w.number}</span>
                      {w.title ? <span className={s.weekTitle}>{w.title}</span> : null}
                    </span>
                    {w.isDone ? (
                      <span className={s.weekState} aria-label="Пройдена">
                        <CheckIcon size={15} />
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <span className={`${s.week} ${s.weekLocked}`} aria-disabled="true" title={hint}>
                    <span className={s.weekNum}>{String(w.number).padStart(2, "0")}</span>
                    <span className={s.weekText}>
                      <span className={s.weekLabel}>Неделя {w.number}</span>
                      <span className={s.weekTitle}>{hint}</span>
                    </span>
                    <span className={s.weekState} aria-label="Закрыта">
                      <LockIcon size={15} />
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      </div>

      {curator ? (
        <section className={`paper ${s.curator}`} aria-label="Мой куратор">
          <span className={s.curatorKicker}>Мой куратор</span>
          <strong className={s.curatorName}>{curator.name}</strong>
          {curator.schedule ? (
            <span className={s.curatorTime}>
              <ClockIcon size={15} />
              {curator.schedule}
            </span>
          ) : null}
        </section>
      ) : null}
    </aside>
  );
}
