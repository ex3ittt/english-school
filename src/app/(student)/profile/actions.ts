"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/session";
import { hashToken } from "@/lib/auth/tokens";

export type ProfileState = { error?: string; ok?: string };

export async function updateNameAction(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "Сессия истекла. Войдите снова." };
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2) return { error: "Имя слишком короткое." };
  if (name.length > 80) return { error: "Имя слишком длинное." };
  await db.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/", "layout");
  return { ok: "Имя сохранено." };
}

export async function changePasswordAction(_: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await getSessionUser();
  if (!user) return { error: "Сессия истекла. Войдите снова." };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  const record = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, record.passwordHash))) return { error: "Текущий пароль введён неверно." };
  const problem = validateNewPassword(next);
  if (problem) return { error: problem };
  if (next !== repeat) return { error: "Новые пароли не совпадают." };
  if (next === current) return { error: "Новый пароль совпадает со старым." };

  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } }),
    // Остаёмся в системе здесь, выходим на остальных устройствах.
    db.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash: hashToken(token) } } }),
  ]);
  return { ok: "Пароль изменён. На других устройствах нужно будет войти заново." };
}
