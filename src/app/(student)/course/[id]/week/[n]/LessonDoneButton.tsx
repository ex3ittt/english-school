"use client";

import { useOptimistic, useState, useTransition } from "react";
import { CheckIcon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { setLessonDone } from "../../../actions";
import p from "../../pages.module.css";

export function LessonDoneButton({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !optimisticDone;
    setError(null);
    startTransition(async () => {
      setOptimisticDone(next);
      const result = await setLessonDone(lessonId, next);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className={p.doneRow}>
      {optimisticDone ? (
        <>
          <span className={p.doneMark}>
            <CheckIcon size={18} /> Урок просмотрен
          </span>
          <button type="button" className={ui.link} onClick={toggle} disabled={pending}>
            Отменить отметку
          </button>
        </>
      ) : (
        <button type="button" className={ui.primary} onClick={toggle} disabled={pending}>
          <CheckIcon size={17} /> Урок просмотрен
        </button>
      )}
      {error ? (
        <span className={p.doneError} role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}
