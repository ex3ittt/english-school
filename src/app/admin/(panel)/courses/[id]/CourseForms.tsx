"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormMessage, SubmitButton } from "@/components/admin/bits";
import { Uploader } from "@/components/admin/Uploader";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { setCourseCoverAction, updateCourseAction, type CourseState } from "../actions";

type Values = {
  title: string;
  level: string;
  levelCode: string;
  description: string;
  isMain: boolean;
  isPublished: boolean;
  autoUnlock: boolean;
};

export function CourseForm({ courseId, values }: { courseId: string; values: Values }) {
  const [state, action] = useActionState<CourseState, FormData>(updateCourseAction.bind(null, courseId), {});
  return (
    <form action={action} className={s.form}>
      <FormMessage state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Название</span>
        <input className={ui.input} name="title" defaultValue={values.title} required />
      </label>
      <div className={s.formRow}>
        <label className={ui.field}>
          <span className={ui.label}>Уровень</span>
          <input className={ui.input} name="level" defaultValue={values.level} placeholder="Elementary" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Код уровня</span>
          <input className={ui.input} name="levelCode" defaultValue={values.levelCode} placeholder="A2" maxLength={4} />
        </label>
      </div>
      <label className={ui.field}>
        <span className={ui.label}>Описание</span>
        <textarea className={ui.input} name="description" defaultValue={values.description} rows={4} />
      </label>
      <label className={ui.check}>
        <input type="checkbox" name="isPublished" defaultChecked={values.isPublished} />
        Опубликован (виден на полке)
      </label>
      <label className={ui.check}>
        <input type="checkbox" name="isMain" defaultChecked={values.isMain} />
        Основной курс (крупно слева на полке)
      </label>
      <label className={ui.check}>
        <input type="checkbox" name="autoUnlock" defaultChecked={values.autoUnlock} />
        Автооткрытие: неделя открывается через 7 дней после предыдущей
      </label>
      <div className={s.formActions}>
        <SubmitButton>Сохранить</SubmitButton>
      </div>
    </form>
  );
}

export function CourseCoverEditor({ courseId, cover }: { courseId: string; cover: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className={s.form}>
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="Обложка курса" style={{ width: 160, aspectRatio: "3 / 4", objectFit: "cover", borderRadius: 3 }} />
      ) : (
        <p className={s.muted}>Без картинки на полке показывается типографская обложка с кодом уровня.</p>
      )}
      <Uploader
        kind="image"
        compact
        label={cover ? "Заменить обложку" : "Загрузить обложку"}
        onUploaded={async (r) => {
          await setCourseCoverAction(courseId, r.key);
          router.refresh();
        }}
      />
      {cover ? (
        <div>
          <button
            type="button"
            className={`${ui.danger} ${ui.small}`}
            disabled={pending}
            onClick={() => start(() => setCourseCoverAction(courseId, null))}
          >
            Убрать обложку
          </button>
        </div>
      ) : null}
      <p className={ui.hint}>Пропорции 3:4, JPG/PNG/WebP до 10 МБ.</p>
    </div>
  );
}
