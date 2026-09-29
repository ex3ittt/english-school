"use client";

import Link from "next/link";
import { useActionState } from "react";
import ui from "@/components/ui.module.css";
import { adminLoginAction, loginAction, type FormState } from "./actions";
import s from "./auth.module.css";

export function LoginForm({ admin = false, next }: { admin?: boolean; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(admin ? adminLoginAction : loginAction, {});

  return (
    <div className={`paper ${s.sheet}`}>
      <span className={s.tab}>{admin ? "Администратор" : "Вход"}</span>
      <h2 className={s.sheetTitle}>{admin ? "Панель школы" : "Войти в кабинет"}</h2>
      <p className={s.sheetLead}>
        {admin ? "Управление курсами, уроками и учениками." : "Используйте email и пароль, которые выдала школа."}
      </p>

      <form action={action} className={s.form} noValidate>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {state.error ? (
          <p className={ui.error} role="alert">
            {state.error}
          </p>
        ) : null}

        <label className={ui.field}>
          <span className={ui.label}>Email</span>
          <input
            className={ui.input}
            type="email"
            name="email"
            autoComplete="username"
            inputMode="email"
            defaultValue={state.email}
            aria-invalid={!!state.error}
            required
          />
        </label>

        <label className={ui.field}>
          <span className={ui.label}>Пароль</span>
          <input
            className={ui.input}
            type="password"
            name="password"
            autoComplete="current-password"
            aria-invalid={!!state.error}
            required
          />
        </label>

        <div className={s.row}>
          <button type="submit" className={ui.primary} disabled={pending}>
            {pending ? "Проверяем…" : "Войти"}
          </button>
          {admin ? null : (
            <Link href="/forgot" className={`${ui.link} ${s.small}`}>
              Забыли пароль?
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
