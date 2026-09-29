"use client";

import { useFormStatus } from "react-dom";
import ui from "@/components/ui.module.css";

export function SubmitButton({
  children,
  pendingText = "Сохраняем…",
  variant = "primary",
  small,
}: {
  children: React.ReactNode;
  pendingText?: string;
  variant?: "primary" | "secondary" | "danger";
  small?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={`${ui[variant]} ${small ? ui.small : ""}`} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Кнопка отправки формы с подтверждением — для необратимых действий. */
export function ConfirmSubmit({
  children,
  message,
  variant = "danger",
  small = true,
}: {
  children: React.ReactNode;
  message: string;
  variant?: "primary" | "secondary" | "danger";
  small?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`${ui[variant]} ${small ? ui.small : ""}`}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } }) {
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
