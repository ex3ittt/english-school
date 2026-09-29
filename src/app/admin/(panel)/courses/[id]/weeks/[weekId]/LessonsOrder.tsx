"use client";

import Link from "next/link";
import { SortableList } from "@/components/admin/SortableList";
import s from "@/components/admin/admin.module.css";
import { reorderLessonsAction } from "../../../actions";

type Lesson = { id: string; title: string; videos: number; blocks: number };

export function LessonsOrder({ lessons }: { lessons: Lesson[] }) {
  return (
    <SortableList
      label="Порядок уроков"
      onReorder={reorderLessonsAction}
      items={lessons.map((l) => ({
        id: l.id,
        node: (
          <div className={s.cellMain}>
            <Link href={`/admin/lessons/${l.id}`}>{l.title}</Link>
            <span className={s.cellSub}>
              {l.videos ? `${l.videos} видео преп.` : "нет видео"} · {l.blocks} блоков
            </span>
          </div>
        ),
      }))}
    />
  );
}
