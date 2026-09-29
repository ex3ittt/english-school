"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/bits";
import { SortableList } from "@/components/admin/SortableList";
import { Uploader } from "@/components/admin/Uploader";
import s from "@/components/admin/admin.module.css";
import { FileIcon, TextIcon, VideoIcon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { VideoPlayer } from "@/components/VideoPlayer";
import {
  addBlockAction,
  deleteBlockAction,
  removeTeacherVideoAction,
  reorderBlocksAction,
  saveTeacherLinkAction,
  saveTeacherUploadAction,
  setBlockLinkAction,
  setBlockUploadAction,
  updateBlockAction,
  updateLessonAction,
  type LessonState,
} from "../actions";
import e from "./editor.module.css";

type Provider = "UPLOAD" | "VIMEO" | "KINESCOPE";
const PROVIDER_LABEL: Record<Provider, string> = { UPLOAD: "Файл", VIMEO: "Vimeo", KINESCOPE: "Kinescope" };

function duration(sec: number | null | undefined) {
  if (!sec) return "";
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

export function LessonForm({ lessonId, title, summary }: { lessonId: string; title: string; summary: string }) {
  const [state, action] = useActionState<LessonState, FormData>(updateLessonAction.bind(null, lessonId), {});
  return (
    <form action={action} className={s.form}>
      <FormMessage state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Название</span>
        <input className={ui.input} name="title" defaultValue={title} required />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Коротко об уроке</span>
        <textarea className={ui.input} name="summary" defaultValue={summary} rows={3} />
      </label>
      <div className={s.formActions}>
        <SubmitButton>Сохранить</SubmitButton>
      </div>
    </form>
  );
}

/** Форма ссылки Vimeo / Kinescope. */
function LinkForm({
  action,
  defaultProvider,
  defaultUrl,
}: {
  action: (state: LessonState, fd: FormData) => Promise<LessonState>;
  defaultProvider?: Provider | null;
  defaultUrl?: string | null;
}) {
  const [state, formAction] = useActionState<LessonState, FormData>(action, {});
  return (
    <form action={formAction} className={e.linkForm}>
      <FormMessage state={state} />
      <div className={e.linkRow}>
        <select name="provider" className={ui.input} defaultValue={defaultProvider === "KINESCOPE" ? "KINESCOPE" : "VIMEO"} aria-label="Сервис">
          <option value="VIMEO">Vimeo</option>
          <option value="KINESCOPE">Kinescope</option>
        </select>
        <input className={ui.input} name="url" type="url" placeholder="https://vimeo.com/…" defaultValue={defaultUrl ?? ""} required aria-label="Ссылка на видео" />
        <SubmitButton variant="secondary" small>
          Сохранить ссылку
        </SubmitButton>
      </div>
    </form>
  );
}

type TeacherVideo = { id: string; provider: Provider; url: string | null; poster: string | null; durationSec: number | null };

export function TeacherVideoRow({
  lessonId,
  teacher,
  video,
}: {
  lessonId: string;
  teacher: { id: string; name: string; photo: string | null };
  video: TeacherVideo | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"none" | "upload" | "link" | "preview">("none");
  const [pending, start] = useTransition();

  return (
    <div className={e.teacherRow}>
      <div className={e.teacherHead}>
        {teacher.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teacher.photo} alt="" className={e.avatar} />
        ) : (
          <span className={e.avatar}>{teacher.name.slice(0, 1)}</span>
        )}
        <div className={e.teacherInfo}>
          <strong>{teacher.name}</strong>
          {video ? (
            <span className={s.cellSub}>
              {PROVIDER_LABEL[video.provider]}
              {video.durationSec ? ` · ${duration(video.durationSec)}` : ""}
              {video.url ? ` · ${video.url}` : ""}
            </span>
          ) : (
            <span className={s.cellSub}>Видео нет — ученики этого преподавателя увидят версию другого.</span>
          )}
        </div>
        {video?.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={video.poster} alt="Превью" className={e.poster} />
        ) : null}
      </div>

      <div className={e.rowActions}>
        {video ? (
          <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setMode(mode === "preview" ? "none" : "preview")}>
            {mode === "preview" ? "Скрыть" : "Просмотреть"}
          </button>
        ) : null}
        <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setMode(mode === "upload" ? "none" : "upload")}>
          {video ? "Заменить файлом" : "Загрузить видео"}
        </button>
        <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setMode(mode === "link" ? "none" : "link")}>
          Ссылка Vimeo / Kinescope
        </button>
        {video ? (
          <button
            type="button"
            className={`${ui.danger} ${ui.small}`}
            disabled={pending}
            onClick={() => {
              if (confirm(`Удалить видео преподавателя ${teacher.name}?`)) start(() => removeTeacherVideoAction(video.id));
            }}
          >
            Удалить
          </button>
        ) : null}
      </div>

      {mode === "preview" && video ? (
        <div className={e.preview}>
          <VideoPlayer source={{ kind: "lesson", id: video.id }} />
        </div>
      ) : null}
      {mode === "upload" ? (
        <Uploader
          kind="video"
          label="Выберите видео (MP4, WebM, MOV)"
          onUploaded={async (r) => {
            await saveTeacherUploadAction(lessonId, teacher.id, {
              videoKey: r.key,
              posterKey: r.posterKey,
              durationSec: r.durationSec,
            });
            router.refresh();
          }}
        />
      ) : null}
      {mode === "link" ? (
        <LinkForm
          action={saveTeacherLinkAction.bind(null, lessonId, teacher.id)}
          defaultProvider={video?.provider}
          defaultUrl={video?.url}
        />
      ) : null}
    </div>
  );
}

type Block = {
  id: string;
  type: "VIDEO" | "TEXT" | "FILE";
  title: string;
  text: string | null;
  videoProvider: Provider | null;
  videoUrl: string | null;
  hasVideo: boolean;
  poster: string | null;
  fileName: string | null;
  fileSize: number | null;
  hasFile: boolean;
};

const TYPE_LABEL = { VIDEO: "Видео", TEXT: "Текст", FILE: "Файл" };
const TYPE_ICON = { VIDEO: VideoIcon, TEXT: TextIcon, FILE: FileIcon };

function BlockEditor({ block }: { block: Block }) {
  const router = useRouter();
  const [state, action] = useActionState<LessonState, FormData>(updateBlockAction.bind(null, block.id), {});
  const [media, setMedia] = useState<"none" | "upload" | "link" | "preview">("none");
  const [pending, start] = useTransition();
  const Icon = TYPE_ICON[block.type];

  return (
    <div className={e.block}>
      <form action={action} className={e.blockForm}>
        <div className={e.blockHead}>
          <span className={e.blockType}>
            <Icon size={15} /> {TYPE_LABEL[block.type]}
          </span>
          <input className={`${ui.input} ${e.blockTitle}`} name="title" defaultValue={block.title} placeholder="Заголовок блока" aria-label="Заголовок блока" />
        </div>
        {block.type === "TEXT" ? (
          <textarea
            className={ui.input}
            name="text"
            defaultValue={block.text ?? ""}
            rows={5}
            placeholder="Текст задания. Переносы строк сохраняются."
            aria-label="Текст блока"
          />
        ) : null}
        <FormMessage state={state} />
        <div className={e.rowActions}>
          <SubmitButton variant="secondary" small>
            Сохранить
          </SubmitButton>
          <button
            type="button"
            className={`${ui.danger} ${ui.small}`}
            disabled={pending}
            onClick={() => {
              if (confirm("Удалить блок?")) start(() => deleteBlockAction(block.id));
            }}
          >
            Удалить блок
          </button>
        </div>
      </form>

      {block.type === "VIDEO" ? (
        <div className={e.media}>
          <p className={s.cellSub}>
            {block.hasVideo
              ? `Видео: ${PROVIDER_LABEL[block.videoProvider ?? "UPLOAD"]}${block.videoUrl ? ` · ${block.videoUrl}` : ""}`
              : "Видео ещё не добавлено"}
          </p>
          <div className={e.rowActions}>
            {block.hasVideo ? (
              <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setMedia(media === "preview" ? "none" : "preview")}>
                {media === "preview" ? "Скрыть" : "Просмотреть"}
              </button>
            ) : null}
            <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setMedia(media === "upload" ? "none" : "upload")}>
              {block.hasVideo ? "Заменить файлом" : "Загрузить видео"}
            </button>
            <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => setMedia(media === "link" ? "none" : "link")}>
              Ссылка Vimeo / Kinescope
            </button>
          </div>
          {media === "preview" ? <VideoPlayer source={{ kind: "block", id: block.id }} /> : null}
          {media === "upload" ? (
            <Uploader
              kind="video"
              label="Выберите видео"
              onUploaded={async (r) => {
                await setBlockUploadAction(block.id, { kind: "video", videoKey: r.key, posterKey: r.posterKey });
                router.refresh();
              }}
            />
          ) : null}
          {media === "link" ? (
            <LinkForm action={setBlockLinkAction.bind(null, block.id)} defaultProvider={block.videoProvider} defaultUrl={block.videoUrl} />
          ) : null}
        </div>
      ) : null}

      {block.type === "FILE" ? (
        <div className={e.media}>
          <p className={s.cellSub}>
            {block.hasFile
              ? `${block.fileName ?? "Файл"}${block.fileSize ? ` · ${Math.max(1, Math.round(block.fileSize / 1024))} КБ` : ""}`
              : "Файл ещё не прикреплён"}
          </p>
          <Uploader
            kind="file"
            compact
            label={block.hasFile ? "Заменить файл" : "Прикрепить файл (PDF, DOCX, MP3…)"}
            onUploaded={async (r) => {
              await setBlockUploadAction(block.id, { kind: "file", fileKey: r.key, fileName: r.fileName, fileSize: r.size });
              router.refresh();
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

export function BlocksEditor({ lessonId, blocks }: { lessonId: string; blocks: Block[] }) {
  const [pending, start] = useTransition();
  return (
    <div className={s.form}>
      {blocks.length === 0 ? (
        <p className={s.muted}>Блоков нет. Добавьте воркшоп, домашнее задание или файл.</p>
      ) : (
        <SortableList label="Порядок блоков" onReorder={reorderBlocksAction} items={blocks.map((b) => ({ id: b.id, node: <BlockEditor block={b} /> }))} />
      )}
      <div className={e.rowActions}>
        <span className={s.muted}>Добавить блок:</span>
        {(["VIDEO", "TEXT", "FILE"] as const).map((type) => {
          const Icon = TYPE_ICON[type];
          return (
            <button
              key={type}
              type="button"
              className={`${ui.secondary} ${ui.small}`}
              disabled={pending}
              onClick={() => start(() => addBlockAction(lessonId, type))}
            >
              <Icon size={15} /> {TYPE_LABEL[type]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
