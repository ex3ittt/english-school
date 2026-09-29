"use client";

import Link from "next/link";
import { SortableList } from "@/components/admin/SortableList";
import s from "@/components/admin/admin.module.css";
import { reorderCoursesAction } from "./actions";

type Course = {
  id: string;
  title: string;
  level: string;
  levelCode: string;
  isMain: boolean;
  isPublished: boolean;
  autoUnlock: boolean;
  _count: { weeks: number; enrollments: number };
};

export function CoursesOrder({ courses }: { courses: Course[] }) {
  return (
    <SortableList
      label="Порядок курсов на полке"
      onReorder={reorderCoursesAction}
      items={courses.map((c) => ({
        id: c.id,
        node: (
          <div className={s.cellMain}>
            <Link href={`/admin/courses/${c.id}`}>
              {c.levelCode ? `${c.levelCode} · ` : ""}
              {c.title}
            </Link>
            <span className={s.cellSub}>
              {c._count.weeks} нед. · {c._count.enrollments} учеников
              {c.isMain ? " · основной" : ""}
              {c.autoUnlock ? " · автооткрытие" : ""}
              {c.isPublished ? "" : " · скрыт"}
            </span>
          </div>
        ),
      }))}
    />
  );
}
