"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CheckIcon } from "@/components/icons";
import p from "../../pages.module.css";

const SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const FULL = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

type Day = { dayOfWeek: number; hasLessons: boolean; done: boolean };

export function DayTabs({
  courseId,
  weekNumber,
  days,
  active,
}: {
  courseId: string;
  weekNumber: number;
  days: Day[];
  active: number;
}) {
  const activeRef = useRef<HTMLAnchorElement>(null);

  // На узком экране вкладки скроллятся: держим активную в поле зрения.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav className={p.days} aria-label="Дни недели">
      {days.map((d) => {
        const label = (
          <>
            <span className={p.dayShort}>{SHORT[d.dayOfWeek - 1]}</span>
            <span className={p.dayFull}>{FULL[d.dayOfWeek - 1]}</span>
            {d.done ? <CheckIcon size={14} className={p.dayCheck} aria-label="Пройдено" /> : null}
          </>
        );
        if (!d.hasLessons) {
          return (
            <span key={d.dayOfWeek} className={`${p.day} ${p.dayEmpty}`} aria-disabled="true" title="Уроков нет">
              {label}
            </span>
          );
        }
        const isActive = d.dayOfWeek === active;
        return (
          <Link
            key={d.dayOfWeek}
            ref={isActive ? activeRef : undefined}
            href={`/course/${courseId}/week/${weekNumber}?day=${d.dayOfWeek}`}
            className={`${p.day} ${isActive ? p.dayActive : ""}`}
            aria-current={isActive ? "page" : undefined}
            scroll={false}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
