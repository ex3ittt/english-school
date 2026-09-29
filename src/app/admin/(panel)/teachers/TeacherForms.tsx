"use client";

import { useRouter } from "next/navigation";
import { useActionState, useTransition } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/bits";
import { SortableList } from "@/components/admin/SortableList";
import { Uploader } from "@/components/admin/Uploader";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import {
  createTeacherAction,
  deleteTeacherAction,
  reorderTeachersAction,
  setTeacherPhotoAction,
  updateTeacherAction,
  type TeacherState,
} from "./actions";
import t from "./teachers.module.css";

type Teacher = { id: string; name: string; bio: string; photo: string | null; videos: number };

export function NewTeacherForm() {
  const [state, action] = useActionState<TeacherState, FormData>(createTeacherAction, {});
  return (
    <form action={action} className={s.form} key={state.ok}>
      <FormMessage state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Имя</span>
        <input className={ui.input} name="name" required />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Коротко о преподавателе</span>
        <textarea className={ui.input} name="bio" rows={4} placeholder="Две-три фразы: стиль уроков, опыт." />
      </label>
      <div>
        <SubmitButton pendingText="Добавляем…">Добавить</SubmitButton>
      </div>
    </form>
  );
}

function TeacherItem({ teacher }: { teacher: Teacher }) {
  const router = useRouter();
  const [state, action] = useActionState<TeacherState, FormData>(updateTeacherAction.bind(null, teacher.id), {});
  const [pending, start] = useTransition();
  return (
    <div className={t.item}>
      <div className={t.photoCol}>
        {teacher.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={teacher.photo} alt="" className={t.photo} />
        ) : (
          <span className={t.photo}>{teacher.name.slice(0, 1)}</span>
        )}
        <Uploader
          kind="image"
          compact
          label={teacher.photo ? "Заменить" : "Фото"}
          onUploaded={async (r) => {
            await setTeacherPhotoAction(teacher.id, r.key);
            router.refresh();
          }}
        />
      </div>
      <form action={action} className={s.form}>
        <FormMessage state={state} />
        <input className={ui.input} name="name" defaultValue={teacher.name} aria-label="Имя" required />
        <textarea className={ui.input} name="bio" defaultValue={teacher.bio} rows={3} aria-label="Описание" />
        <div className={s.formActions}>
          <SubmitButton variant="secondary" small>
            Сохранить
          </SubmitButton>
          <span className={s.muted}>{teacher.videos} видео в уроках</span>
          <button
            type="button"
            className={`${ui.danger} ${ui.small}`}
            style={{ marginLeft: "auto" }}
            disabled={pending}
            onClick={() => {
              const warn = teacher.videos ? ` Вместе с ним удалятся ${teacher.videos} видео из уроков.` : "";
              if (confirm(`Удалить преподавателя ${teacher.name}?${warn}`)) start(() => deleteTeacherAction(teacher.id));
            }}
          >
            Удалить
          </button>
        </div>
      </form>
    </div>
  );
}

export function TeachersList({ teachers }: { teachers: Teacher[] }) {
  return (
    <SortableList
      label="Порядок преподавателей"
      onReorder={reorderTeachersAction}
      items={teachers.map((teacher) => ({ id: teacher.id, node: <TeacherItem teacher={teacher} /> }))}
    />
  );
}
