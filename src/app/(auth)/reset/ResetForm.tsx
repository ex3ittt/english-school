"use client";

import Link from "next/link";
import { useActionState } from "react";
import ui from "@/components/ui.module.css";
import { resetPasswordAction, type FormState } from "../actions";
import s from "../auth.module.css";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPasswordAction, {});

  if (!token) {
    return (
      <div className={`paper ${s.sheet}`}>
        <span className={s.tab}>Пароль</span>
        <p className={ui.error}>В ссылке нет кода восстановления. Запросите письмо ещё раз.</p>
        <div className={s.row}>
          <Link href="/forgot" className={ui.secondary}>
            Запросить ссылку
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`paper ${s.sheet}`}>
      <span className={s.tab}>Пароль</span>
      <h2 className={s.sheetTitle}>Новый пароль</h2>
      <p className={s.sheetLead}>Введите его дважды, чтобы не ошибиться.</p>

      {state.ok ? (
        <div className={s.form}>
          <p className={ui.success} role="status">
            {state.ok}
          </p>
          <Link href="/login" className={ui.primary}>
            Войти
          </Link>
        </div>
      ) : (
        <form action={action} className={s.form} noValidate>
          <input type="hidden" name="token" value={token} />
          {state.error ? (
            <p className={ui.error} role="alert">
              {state.error}
            </p>
          ) : null}
          <label className={ui.field}>
            <span className={ui.label}>Новый пароль</span>
            <input className={ui.input} type="password" name="password" autoComplete="new-password" minLength={8} required />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Ещё раз</span>
            <input className={ui.input} type="password" name="repeat" autoComplete="new-password" minLength={8} required />
          </label>
          <div className={s.row}>
            <button type="submit" className={ui.primary} disabled={pending}>
              {pending ? "Сохраняем…" : "Сохранить пароль"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
