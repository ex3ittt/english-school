const DAY = 24 * 60 * 60 * 1000;

export function relativeDays(date: Date | null | undefined): string {
  if (!date) return "ни разу";
  const diff = Date.now() - date.getTime();
  if (diff < 60 * 60 * 1000) return "только что";
  if (diff < DAY) return "сегодня";
  const days = Math.floor(diff / DAY);
  if (days === 1) return "вчера";
  if (days < 5) return `${days} дня назад`;
  if (days < 21) return `${days} дней назад`;
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function dateTime(date: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  }).format(date);
}

export function toDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const STALE_DAYS = 7;
