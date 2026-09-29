"use client";

import { useActionState } from "react";
import ui from "@/components/ui.module.css";
import { changePasswordAction, updateNameAction, type ProfileState } from "./actions";
import s from "./profile.module.css";

function Message({ state }: { state: ProfileState }) {
  if (state.error)
    return (
      <p className={ui.error} role="alert">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p className={ui.success} role="status">
        {state.ok}
      </p>
    );
  return null;
}

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(updateNameAction, {});
  return (
    <form action={action} className={s.form}>
      <Message state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Имя и фамилия</span>
        <input className={ui.input} name="name" defaultValue={name} autoComplete="name" required />
      </label>
      <div>
        <button type="submit" className={ui.secondary} disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить"}
        </button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ProfileState, FormData>(changePasswordAction, {});
  return (
    <form action={action} className={s.form} key={state.ok}>
      <Message state={state} />
      <label className={ui.field}>
        <span className={ui.label}>Текущий пароль</span>
        <input className={ui.input} type="password" name="current" autoComplete="current-password" required />
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Новый пароль</span>
        <input className={ui.input} type="password" name="password" autoComplete="new-password" minLength={8} required />
        <span className={ui.hint}>Не короче 8 символов.</span>
      </label>
      <label className={ui.field}>
        <span className={ui.label}>Новый пароль ещё раз</span>
        <input className={ui.input} type="password" name="repeat" autoComplete="new-password" minLength={8} required />
      </label>
      <div>
        <button type="submit" className={ui.primary} disabled={pending}>
          {pending ? "Меняем…" : "Сменить пароль"}
        </button>
      </div>
    </form>
  );
}
