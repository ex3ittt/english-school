import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";

const MINUTE = 60 * 1000;

export const LIMITS = {
  /** Неверные пароли на один email за 15 минут. */
  loginEmail: { max: 5, windowMs: 15 * MINUTE },
  /** Неверные пароли с одного IP за 15 минут (перебор по разным email). */
  loginIp: { max: 30, windowMs: 15 * MINUTE },
  /** Письма сброса пароля на один email за час. */
  resetEmail: { max: 3, windowMs: 60 * MINUTE },
  /** Запросы сброса с одного IP за час. */
  resetIp: { max: 10, windowMs: 60 * MINUTE },
};

type Limit = { max: number; windowMs: number };

/** IP посетителя: Cloudflare, Vercel/nginx или прямое подключение. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function isLimited(key: string, limit: Limit): Promise<boolean> {
  const since = new Date(Date.now() - limit.windowMs);
  const count = await db.authAttempt.count({ where: { key, createdAt: { gte: since } } });
  return count >= limit.max;
}

export async function recordAttempt(...keys: string[]) {
  await db.authAttempt.createMany({ data: keys.map((key) => ({ key })) });
  // Попутно чистим записи старше суток, чтобы таблица не росла.
  if (Math.random() < 0.05) {
    await db.authAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * MINUTE) } } });
  }
}

export async function clearAttempts(key: string) {
  await db.authAttempt.deleteMany({ where: { key } });
}
