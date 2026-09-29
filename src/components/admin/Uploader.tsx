"use client";

import { useEffect, useRef, useState } from "react";
import { UploadIcon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import s from "./Uploader.module.css";

export type UploadResult = {
  key: string;
  fileName: string;
  size: number;
  contentType: string;
  /** Для видео: кадр-превью, снятый в браузере. */
  posterKey?: string;
  durationSec?: number;
};

type Kind = "video" | "image" | "file";

const ACCEPT: Record<Kind, string> = {
  video: "video/mp4,video/webm,video/quicktime",
  image: "image/jpeg,image/png,image/webp,image/avif",
  file: ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.mp3,.m4a,.wav,.zip,.txt",
};

async function requestUrl(kind: Kind, file: File | Blob, fileName: string, contentType: string) {
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, contentType, size: file.size, fileName }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Не удалось начать загрузку.");
  return data as { key: string; url: string };
}

function put(url: string, file: Blob, contentType: string, onProgress: (p: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Хранилище ответило ${xhr.status}.`)));
    xhr.onerror = () => reject(new Error("Сеть оборвалась во время загрузки. Попробуйте ещё раз."));
    xhr.onabort = () => reject(new DOMException("Отменено", "AbortError"));
    signal.addEventListener("abort", () => xhr.abort());
    xhr.send(file);
  });
}

/** Кадр из видео для превью: берём момент около 1-й секунды. */
async function capturePoster(file: File): Promise<{ blob: Blob | null; duration: number }> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((res, rej) => {
      video.onloadedmetadata = () => res();
      video.onerror = () => rej(new Error("metadata"));
    });
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    video.currentTime = Math.min(1.5, duration / 3 || 0);
    await new Promise<void>((res) => (video.onseeked = () => res()));
    const width = Math.min(1280, video.videoWidth || 1280);
    const height = Math.round((width / (video.videoWidth || 16)) * (video.videoHeight || 9));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(video, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    return { blob, duration };
  } catch {
    return { blob: null, duration: 0 };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} КБ`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} МБ`;
  return `${(n / 1024 ** 3).toFixed(2)} ГБ`;
}

export function Uploader({
  kind,
  label,
  onUploaded,
  compact,
}: {
  kind: Kind;
  label: string;
  onUploaded: (result: UploadResult) => Promise<void> | void;
  compact?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"idle" | "uploading" | "poster" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function start(chosen: File) {
    setError(null);
    setFile(chosen);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(kind === "file" ? null : URL.createObjectURL(chosen));
    setProgress(0);
    setPhase("uploading");
    const controller = new AbortController();
    abort.current = controller;

    try {
      const contentType = chosen.type || "application/octet-stream";
      const { key, url } = await requestUrl(kind, chosen, chosen.name, contentType);
      await put(url, chosen, contentType, setProgress, controller.signal);

      const result: UploadResult = { key, fileName: chosen.name, size: chosen.size, contentType };
      if (kind === "video") {
        setPhase("poster");
        const { blob, duration } = await capturePoster(chosen);
        result.durationSec = Math.round(duration) || undefined;
        if (blob) {
          const poster = await requestUrl("image", blob, "poster.jpg", "image/jpeg");
          await put(poster.url, blob, "image/jpeg", () => {}, controller.signal);
          result.posterKey = poster.key;
        }
      }
      setPhase("saving");
      await onUploaded(result);
      setPhase("done");
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setPhase("idle");
        setFile(null);
        return;
      }
      setError((e as Error).message || "Не удалось загрузить файл.");
      setPhase("error");
    } finally {
      abort.current = null;
      if (input.current) input.current.value = "";
    }
  }

  const busy = phase === "uploading" || phase === "poster" || phase === "saving";
  const statusText =
    phase === "uploading"
      ? `Загружаем… ${Math.round(progress * 100)}%`
      : phase === "poster"
        ? "Делаем превью…"
        : phase === "saving"
          ? "Сохраняем…"
          : phase === "done"
            ? "Готово"
            : null;

  return (
    <div className={`${s.box} ${compact ? s.compact : ""}`}>
      <label
        className={`${s.drop} ${busy ? s.dropBusy : ""}`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const f = e.dataTransfer.files[0];
          if (f && !busy) void start(f);
        }}
      >
        <input
          ref={input}
          type="file"
          accept={ACCEPT[kind]}
          className="visually-hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void start(f);
          }}
        />
        <UploadIcon size={18} />
        <span>{label}</span>
        {!compact ? <small>или перетащите файл сюда</small> : null}
      </label>

      {file && phase !== "idle" ? (
        <div className={s.status}>
          {preview && kind === "video" ? <video className={s.preview} src={preview} muted playsInline /> : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {preview && kind === "image" ? <img className={s.preview} src={preview} alt="" /> : null}
          <div className={s.meta}>
            <span className={s.name}>{file.name}</span>
            <span className={s.size}>
              {formatBytes(file.size)}
              {statusText ? ` · ${statusText}` : ""}
            </span>
            <span className={s.track} aria-hidden="true">
              <span style={{ width: `${phase === "done" || phase === "saving" || phase === "poster" ? 100 : progress * 100}%` }} />
            </span>
            {error ? <span className={s.error}>{error}</span> : null}
          </div>
          {phase === "uploading" ? (
            <button type="button" className={`${ui.secondary} ${ui.small}`} onClick={() => abort.current?.abort()}>
              Отмена
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
