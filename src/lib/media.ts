/** Картинки (обложки, фото, превью) отдаются через маршрут с проверкой входа. */
export function imageUrl(key: string | null | undefined): string | null {
  return key ? `/api/media/image?key=${encodeURIComponent(key)}` : null;
}

export type VideoSource = { kind: "lesson" | "block"; id: string };

export type VideoPayload =
  | { type: "file"; url: string; poster: string | null; expiresIn: number }
  | { type: "embed"; url: string; provider: "VIMEO" | "KINESCOPE" };
