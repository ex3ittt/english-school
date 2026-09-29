"use client";

import ui from "@/components/ui.module.css";
import s from "./status.module.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className={s.page}>
      <div className={`paper ${s.sheet}`}>
        <span className={s.code}>Ошибка</span>
        <h1 className={s.title}>Что-то пошло не так</h1>
        <p className={s.text}>Мы уже знаем о проблеме. Попробуйте обновить страницу через минуту.</p>
        <button type="button" className={ui.primary} onClick={reset}>
          Попробовать ещё раз
        </button>
      </div>
    </main>
  );
}
