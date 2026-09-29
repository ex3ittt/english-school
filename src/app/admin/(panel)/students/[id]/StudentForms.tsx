"use client";

import { useActionState, useTransition } from "react";
import { CopyButton } from "@/components/admin/CopyButton";
import { FormMessage, SubmitButton } from "@/components/admin/bits";
import s from "@/components/admin/admin.module.css";
import ui from "@/components/ui.module.css";
import {
  resetPasswordAction,
  sendResetLinkAction,
  setWeekAccessAction,
  updateEnrollmentAction,
  updateStudentAction,
  type StudentState,
} from "../actions";

export function ProfileForm({ userId, name, email }: { userId: string; name: string; email: string }) {
  const [state, action] = useActionState<StudentState, FormData>(updateStudentAction.bind(null, userId), {});
  return (
    <form action={action} className={s.form}>
      <FormMessage state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Имя и фамилия</span>
        <input className={ui.input} name="name" defaultValue={name} required />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Email (логин)</span>
        <input className={ui.input} name="email" type="email" defaultValue={email} required />
      </label>
      <div className={s.formActions}>
        <SubmitButton variant="secondary">Сохранить</SubmitButton>
      </div>
    </form>
  );
}

export function PasswordTools({ userId }: { userId: string }) {
  const [resetState, resetAction, resetPending] = useActionState<StudentState>(resetPasswordAction.bind(null, userId), {});
  const [linkState, linkAction, linkPending] = useActionState<StudentState>(sendResetLinkAction.bind(null, userId), {});
  return (
    <div className={s.form}>
      {resetState.password ? (
        <>
          <FormMessage state={resetState} />
          <div className={s.secret}>
            <code>{resetState.password}</code>
            <CopyButton text={resetState.password} />
          </div>
        </>
      ) : null}
      <FormMessage state={linkState} />
      <div className={s.formActions}>
        <form action={resetAction}>
          <button
            type="submit"
            className={`${ui.secondary} ${ui.small}`}
            disabled={resetPending}
            onClick={(e) => {
              if (!confirm("Создать новый пароль? Старый перестанет работать.")) e.preventDefault();
            }}
          >
            {resetPending ? "Создаём…" : "Сгенерировать новый пароль"}
          </button>
        </form>
        <form action={linkAction}>
          <button type="submit" className={`${ui.secondary} ${ui.small}`} disabled={linkPending}>
            {linkPending ? "Отправляем…" : "Отправить ссылку на почту"}
          </button>
        </form>
      </div>
    </div>
  );
}

export function EnrollmentForm({
  enrollmentId,
  curatorName,
  curatorSchedule,
  startedAt,
}: {
  enrollmentId: string;
  curatorName: string;
  curatorSchedule: string;
  startedAt: string;
}) {
  const [state, action] = useActionState<StudentState, FormData>(updateEnrollmentAction.bind(null, enrollmentId), {});
  return (
    <form action={action} className={s.form}>
      <FormMessage state={state} />
      <div className={s.formRow}>
        <label className={ui.field}>
          <span className={ui.label}>Куратор</span>
          <input className={ui.input} name="curatorName" defaultValue={curatorName} placeholder="Имя куратора" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Время занятий</span>
          <input className={ui.input} name="curatorSchedule" defaultValue={curatorSchedule} placeholder="Вт и Чт, 19:00 (МСК)" />
        </label>
        <label className={ui.field}>
          <span className={ui.label}>Старт (неделя 1)</span>
          <input className={ui.input} name="startedAt" type="date" defaultValue={startedAt} />
        </label>
      </div>
      <div className={s.formActions}>
        <SubmitButton variant="secondary" small>
          Сохранить
        </SubmitButton>
      </div>
    </form>
  );
}

export function WeekAccessSelect({
  enrollmentId,
  weekId,
  value,
}: {
  enrollmentId: string;
  weekId: string;
  value: "AUTO" | "OPEN" | "CLOSED";
}) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={value}
      disabled={pending}
      aria-label="Доступ к неделе"
      onChange={(e) => {
        const mode = e.target.value as "AUTO" | "OPEN" | "CLOSED";
        start(() => setWeekAccessAction(enrollmentId, weekId, mode));
      }}
    >
      <option value="AUTO">По правилам курса</option>
      <option value="OPEN">Открыть вручную</option>
      <option value="CLOSED">Закрыть вручную</option>
    </select>
  );
}
