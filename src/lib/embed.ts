/**
 * Приводим ссылку Vimeo / Kinescope к адресу встраиваемого плеера.
 * Возвращает null, если ссылка не распознана.
 */
export function toEmbedUrl(provider: "VIMEO" | "KINESCOPE", raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  if (provider === "VIMEO") {
    if (!/(^|\.)vimeo\.com$/.test(url.hostname)) return null;
    const match = url.pathname.match(/(?:\/video)?\/(\d+)(?:\/([0-9a-f]+))?/);
    if (!match) return null;
    const hash = url.searchParams.get("h") ?? match[2];
    const params = new URLSearchParams({ dnt: "1", title: "0", byline: "0", portrait: "0" });
    if (hash) params.set("h", hash);
    return `https://player.vimeo.com/video/${match[1]}?${params}`;
  }

  if (!/(^|\.)kinescope\.io$/.test(url.hostname)) return null;
  const id = url.pathname.replace(/^\/(embed\/)?/, "").split("/")[0];
  if (!id || !/^[\w-]+$/.test(id)) return null;
  return `https://kinescope.io/embed/${id}`;
}
