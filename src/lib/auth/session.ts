import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashToken, newToken } from "./tokens";

export const SESSION_COOKIE = "es_session";
const SESSION_DAYS = 30;
const DAY = 24 * 60 * 60 * 1000;
const LAST_SEEN_THROTTLE = 5 * 60 * 1000;

export async function createSession(userId: string) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt, userAgent } });
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "STUDENT" | "ADMIN";
};

/**
 * Текущий пользователь по cookie. Кешируется на время одного запроса.
 * Заблокированный пользователь и просроченная сессия дают null.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, isBlocked: true, lastSeenAt: true } } },
  });
  if (!session || session.expiresAt < new Date() || session.user.isBlocked) return null;

  const { user } = session;
  const now = Date.now();
  if (!user.lastSeenAt || now - user.lastSeenAt.getTime() > LAST_SEEN_THROTTLE) {
    await db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date(now) } });
  }
  return { id: user.id, email: user.email, name: user.name, role: user.role };
});
