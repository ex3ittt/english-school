"use client";

import Link from "next/link";
import { useActionState } from "react";
import ui from "@/components/ui.module.css";
import { forgotPasswordAction, type FormState } from "../actions";
import s from "../auth.module.css";

export function ForgotForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(forgotPasswordAction, {});

  return (
    <div className={`paper ${s.sheet}`}>
      <span className={s.tab}>Пароль</span>
      <h2 className={s.sheetTitle}>Новый пароль</h2>
      <p className={s.sheetLead}>Ссылка действует один час.</p>

      {state.ok ? (
        <div className={s.form}>
          <p className={ui.success} role="status">
            {state.ok}
          </p>
          <Link href="/login" className={ui.secondary}>
            Вернуться ко входу
          </Link>
        </div>
      ) : (
        <form action={action} className={s.form} noValidate>
          {state.error ? (
            <p className={ui.error} role="alert">
              {state.error}
            </p>
          ) : null}
          <label className={ui.field}>
            <span className={ui.label}>Email</span>
            <input className={ui.input} type="email" name="email" autoComplete="email" inputMode="email" required />
          </label>
          <div className={s.row}>
            <button type="submit" className={ui.primary} disabled={pending}>
              {pending ? "Отправляем…" : "Прислать ссылку"}
            </button>
            <Link href="/login" className={`${ui.link} ${s.small}`}>
              Я вспомнил пароль
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
