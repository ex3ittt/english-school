"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, validateNewPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { sendMail } from "@/lib/mail";

export type FormState = { error?: string; ok?: string; email?: string };

const RESET_TTL_MS = 60 * 60 * 1000;

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim().toLowerCase();
}

async function authenticate(formData: FormData): Promise<{ error: string } | { userId: string; role: "ADMIN" | "STUDENT" }> {
  const email = readEmail(formData);
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Введите email и пароль." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Похоже, в email опечатка." };

  let user;
  try {
    user = await db.user.findUnique({ where: { email } });
  } catch (error) {
    console.error("[login] база недоступна:", error);
    return { error: "Сервис временно недоступен. Попробуйте войти через пару минут." };
  }
  // Одинаковое сообщение для «нет такого email» и «неверный пароль».
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) return { error: "Неверный email или пароль." };
  if (user.isBlocked) return { error: "Доступ к кабинету приостановлен. Напишите куратору или в поддержку школы." };
  return { userId: user.id, role: user.role };
}

export async function loginAction(_: FormState, formData: FormData): Promise<FormState> {
  const result = await authenticate(formData);
  if ("error" in result) return { error: result.error, email: readEmail(formData) };
  await createSession(result.userId);
  if (result.role === "ADMIN") redirect("/admin");
  const next = String(formData.get("next") ?? "");
  // Только внутренние пути: защита от открытого редиректа.
  redirect(/^\/(course|courses|profile)(\/|$|\?)/.test(next) ? next : "/courses");
}

export async function adminLoginAction(_: FormState, formData: FormData): Promise<FormState> {
  const result = await authenticate(formData);
  if ("error" in result) return { error: result.error, email: readEmail(formData) };
  if (result.role !== "ADMIN") return { error: "Этот вход только для администраторов.", email: readEmail(formData) };
  await createSession(result.userId);
  redirect("/admin");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function forgotPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const email = readEmail(formData);
  if (!email) return { error: "Введите email, на который зарегистрирован кабинет." };

  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.isBlocked) {
    const token = newToken();
    await db.passwordResetToken.create({
      data: { tokenHash: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + RESET_TTL_MS) },
    });
    const link = `${env.appUrl}/reset?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Восстановление пароля",
      text: `Здравствуйте, ${user.name}!\n\nЧтобы задать новый пароль, откройте ссылку (действует 1 час):\n${link}\n\nЕсли вы не запрашивали восстановление, просто проигнорируйте это письмо.`,
    });
  }
  // Не раскрываем, есть ли такой адрес в базе.
  return { ok: "Если такой адрес есть в школе, мы отправили на него ссылку для смены пароля. Проверьте почту и папку «Спам»." };
}

export async function resetPasswordAction(_: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  const problem = validateNewPassword(password);
  if (problem) return { error: problem };
  if (password !== repeat) return { error: "Пароли не совпадают." };

  const record = await db.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "Ссылка устарела или уже использована. Запросите восстановление ещё раз." };
  }

  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await hashPassword(password) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Выходим на всех устройствах: старый пароль мог быть скомпрометирован.
    db.session.deleteMany({ where: { userId: record.userId } }),
  ]);
  return { ok: "Пароль обновлён. Теперь можно войти с новым паролем." };
}
