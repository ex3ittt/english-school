"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/admin/bits";
import { CopyButton } from "@/components/admin/CopyButton";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import { createStudentAction, type StudentState } from "../actions";

export function NewStudentForm({ courses }: { courses: { id: string; title: string; isMain: boolean }[] }) {
  const [state, action] = useActionState<StudentState, FormData>(createStudentAction, {});

  if (state.createdId && state.password) {
    return (
      <section className={`paper ${s.panel}`} style={{ maxWidth: 640 }}>
        <FormMessage state={state} />
        <p className={s.muted} style={{ margin: "16px 0 8px" }}>
          Временный пароль (показан один раз):
        </p>
        <div className={s.secret}>
          <code>{state.password}</code>
          <CopyButton text={state.password} />
        </div>
        <div className={s.formActions} style={{ marginTop: 20 }}>
          <Link href={`/admin/students/${state.createdId}`} className={ui.primary}>
            Открыть карточку ученика
          </Link>
          {/* Полная перезагрузка сбрасывает состояние формы */}
          <a href="/admin/students/new" className={ui.secondary}>
            Создать ещё одного
          </a>
        </div>
      </section>
    );
  }

  return (
    <form action={action} className={`paper ${s.panel} ${s.form}`} style={{ maxWidth: 640 }}>
      <FormMessage state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Имя и фамилия</span>
        <input className={ui.input} name="name" required autoComplete="off" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Email (логин)</span>
        <input className={ui.input} name="email" type="email" required autoComplete="off" />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Пароль</span>
        <input className={ui.input} name="password" type="text" autoComplete="off" placeholder="Оставьте пустым — придумаем сами" />
        <span className={ui.hint}>Не короче 8 символов. Ученик сможет сменить его в профиле.</span>
      </label>
      <fieldset className={ui.field} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className={ui.label} style={{ marginBottom: 8 }}>
          Курсы
        </legend>
        {courses.map((c) => (
          <label key={c.id} className={ui.check}>
            <input type="checkbox" name="courseIds" value={c.id} defaultChecked={c.isMain} />
            {c.title}
          </label>
        ))}
        <span className={ui.hint}>Куратора, время занятий и доступ к неделям можно указать в карточке ученика.</span>
      </fieldset>
      <div className={s.formActions}>
        <SubmitButton pendingText="Создаём…">Создать ученика</SubmitButton>
      </div>
    </form>
  );
}
