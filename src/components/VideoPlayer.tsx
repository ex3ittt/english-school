"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon } from "@/components/icons";
import type { VideoPayload, VideoSource } from "@/lib/media";
import s from "./VideoPlayer.module.css";

type State = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; payload: VideoPayload };

/**
 * Плеер получает временную ссылку у сервера (после проверки доступа).
 * Если ссылка истекла во время просмотра, берёт новую и продолжает с того же места.
 */
export function VideoPlayer({ source, title }: { source: VideoSource; title?: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const resume = useRef<{ time: number; play: boolean } | null>(null);
  const retries = useRef<number[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/media/video?kind=${source.kind}&id=${encodeURIComponent(source.id)}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Не удалось загрузить видео." });
        return;
      }
      setState({ status: "ready", payload: data as VideoPayload });
    } catch {
      setState({ status: "error", message: "Нет соединения. Проверьте интернет и обновите страницу." });
    }
  }, [source.kind, source.id]);

  useEffect(() => {
    setState({ status: "loading" });
    void load();
  }, [load]);

  function handleError() {
    const video = videoRef.current;
    if (!video) return;
    const now = Date.now();
    retries.current = retries.current.filter((t) => now - t < 60_000);
    if (retries.current.length >= 3) {
      setState({ status: "error", message: "Видео не воспроизводится. Обновите страницу или напишите куратору." });
      return;
    }
    retries.current.push(now);
    resume.current = { time: video.currentTime, play: !video.paused };
    void load();
  }

  function handleLoaded() {
    const video = videoRef.current;
    if (!video || !resume.current) return;
    video.currentTime = resume.current.time;
    if (resume.current.play) void video.play().catch(() => {});
    resume.current = null;
  }

  if (state.status === "loading") {
    return (
      <div className={s.frame} aria-busy="true">
        <div className={s.placeholder}>
          <span className={s.playMark}>
            <PlayIcon size={22} />
          </span>
          <span>Загружаем видео…</span>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className={s.frame}>
        <div className={s.placeholder} role="alert">
          <span>{state.message}</span>
          <button
            type="button"
            className={s.retry}
            onClick={() => {
              retries.current = [];
              setState({ status: "loading" });
              void load();
            }}
          >
            Попробовать ещё раз
          </button>
        </div>
      </div>
    );
  }

  const { payload } = state;
  if (payload.type === "embed") {
    return (
      <div className={s.frame}>
        <iframe
          className={s.media}
          src={payload.url}
          title={title ?? "Видео урока"}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }

  return (
    <div className={s.frame}>
      <video
        ref={videoRef}
        className={s.media}
        src={payload.url}
        poster={payload.poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload"
        onContextMenu={(e) => e.preventDefault()}
        onError={handleError}
        onLoadedMetadata={handleLoaded}
        aria-label={title ?? "Видео урока"}
      />
    </div>
  );
}
