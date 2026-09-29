"use client";

import { useState, useTransition } from "react";
import { DownloadIcon, FileIcon } from "@/components/icons";
import { VideoPlayer } from "@/components/VideoPlayer";
import { setPreferredTeacher } from "../../../actions";
import p from "../../pages.module.css";
import { LessonDoneButton } from "./LessonDoneButton";

type Teacher = { id: string; name: string; bio: string; photo: string | null };
type Block = {
  id: string;
  type: "VIDEO" | "TEXT" | "FILE";
  title: string;
  text: string | null;
  fileName: string | null;
  fileSize: number | null;
};
type Lesson = {
  id: string;
  title: string;
  summary: string;
  done: boolean;
  videos: { id: string; teacherId: string }[];
  blocks: Block[];
};

type Props = {
  courseId: string;
  dayLabel: string;
  teachers: Teacher[];
  preferredTeacherId: string | null;
  lessons: Lesson[];
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatSize(bytes: number | null) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

export function DayView({ courseId, dayLabel, teachers, preferredTeacherId, lessons }: Props) {
  const initial = teachers.find((t) => t.id === preferredTeacherId)?.id ?? teachers[0]?.id ?? null;
  const [teacherId, setTeacherId] = useState(initial);
  const [, startTransition] = useTransition();
  const teacher = teachers.find((t) => t.id === teacherId) ?? null;

  function choose(id: string) {
    setTeacherId(id);
    // Запоминаем выбор на сервере; интерфейс не ждёт ответа.
    startTransition(() => setPreferredTeacher(courseId, id));
  }

  return (
    <div className={p.dayView}>
      <p className={p.dayName}>{dayLabel}</p>

      {teachers.length > 0 ? (
        <section className={p.teachers} aria-label="Преподаватель">
          <div className={p.teacherTabs} role="tablist" aria-label="Выберите преподавателя">
            {teachers.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === teacherId}
                className={`${p.teacherTab} ${t.id === teacherId ? p.teacherTabActive : ""}`}
                onClick={() => choose(t.id)}
              >
                {t.name}
              </button>
            ))}
          </div>

          {teacher ? (
            <div className={p.teacherCard}>
              {teacher.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={teacher.photo} alt="" className={p.teacherPhoto} />
              ) : (
                <span className={p.teacherMono} aria-hidden="true">
                  {initials(teacher.name)}
                </span>
              )}
              <div>
                <strong className={p.teacherName}>{teacher.name}</strong>
                {teacher.bio ? <p className={p.teacherBio}>{teacher.bio}</p> : null}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {lessons.map((lesson, index) => {
        const video = lesson.videos.find((v) => v.teacherId === teacherId) ?? lesson.videos[0] ?? null;
        const fallbackTeacher =
          video && video.teacherId !== teacherId ? teachers.find((t) => t.id === video.teacherId) : null;

        return (
          <article key={lesson.id} className={p.lesson}>
            <header className={p.lessonHead}>
              {lessons.length > 1 ? <span className={p.lessonIndex}>Урок {index + 1}</span> : null}
              <h2 className={p.lessonTitle}>{lesson.title}</h2>
              {lesson.summary ? <p className={p.lessonSummary}>{lesson.summary}</p> : null}
            </header>

            {video ? (
              <div className={p.mainVideo}>
                <VideoPlayer key={video.id} source={{ kind: "lesson", id: video.id }} title={lesson.title} />
                {fallbackTeacher ? (
                  <p className={p.videoNote}>
                    У выбранного преподавателя нет записи этого урока — показываем версию: {fallbackTeacher.name}.
                  </p>
                ) : null}
              </div>
            ) : null}

            {lesson.blocks.map((block, i) => (
              <section key={block.id} className={p.block}>
                <h3 className={p.blockTitle}>
                  <span className={p.blockNum}>{String(i + 1).padStart(2, "0")}</span>
                  {block.title ||
                    (block.type === "VIDEO" ? "Видео" : block.type === "FILE" ? "Материалы" : "Задание")}
                </h3>
                {block.type === "VIDEO" ? (
                  <VideoPlayer source={{ kind: "block", id: block.id }} title={block.title} />
                ) : null}
                {block.type === "TEXT" && block.text ? <div className={p.blockText}>{block.text}</div> : null}
                {block.type === "FILE" ? (
                  <a className={p.file} href={`/api/media/file/${block.id}`} rel="nofollow">
                    <span className={p.fileIcon}>
                      <FileIcon size={22} />
                    </span>
                    <span className={p.fileText}>
                      <span className={p.fileName}>{block.fileName ?? "Файл"}</span>
                      <span className={p.fileMeta}>{formatSize(block.fileSize)}</span>
                    </span>
                    <DownloadIcon size={18} className={p.fileDl} />
                  </a>
                ) : null}
              </section>
            ))}

            <LessonDoneButton lessonId={lesson.id} done={lesson.done} />
          </article>
        );
      })}
    </div>
  );
}
