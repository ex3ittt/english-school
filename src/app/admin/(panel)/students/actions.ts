"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertAdmin } from "@/lib/auth/guards";
import { generateTempPassword, hashPassword, validateNewPassword } from "@/lib/auth/password";
import { hashToken, newToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMail } from "@/lib/mail";

export type StudentState = { error?: string; ok?: string; createdId?: string; password?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readProfile(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim().replace(/\s+/g, " "),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  };
}

function checkProfile({ name, email }: { name: string; email: string }) {
  if (name.length < 2) return "Укажите имя ученика.";
  if (!EMAIL_RE.test(email)) return "Проверьте email: похоже, в нём опечатка.";
  return null;
}

export async function createStudentAction(_: StudentState, formData: FormData): Promise<StudentState> {
  await assertAdmin();
  const profile = readProfile(formData);
  const problem = checkProfile(profile);
  if (problem) return { error: problem };

  if (await db.user.findUnique({ where: { email: profile.email } })) {
    return { error: "Ученик с таким email уже есть." };
  }

  let password = String(formData.get("password") ?? "").trim();
  if (password) {
    const bad = validateNewPassword(password);
    if (bad) return { error: bad };
  } else {
    password = generateTempPassword();
  }

  const courseIds = formData.getAll("courseIds").map(String).filter(Boolean);
  const user = await db.user.create({
    data: {
      ...profile,
      passwordHash: await hashPassword(password),
      enrollments: { create: courseIds.map((courseId) => ({ courseId })) },
    },
  });
  revalidatePath("/admin/students");
  return { ok: "Ученик создан.", createdId: user.id, password };
}

export async function updateStudentAction(userId: string, _: StudentState, formData: FormData): Promise<StudentState> {
  await assertAdmin();
  const profile = readProfile(formData);
  const problem = checkProfile(profile);
  if (problem) return { error: problem };
  const other = await db.user.findUnique({ where: { email: profile.email } });
  if (other && other.id !== userId) return { error: "Этот email уже занят другим пользователем." };

  await db.user.update({ where: { id: userId }, data: profile });
  revalidatePath(`/admin/students/${userId}`);
  revalidatePath("/admin/students");
  return { ok: "Данные сохранены." };
}

export async function setBlockedAction(userId: string, blocked: boolean) {
  const admin = await assertAdmin();
  if (admin.id === userId) throw new Error("Нельзя заблокировать самого себя");
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { isBlocked: blocked } }),
    // Блокировка сразу выкидывает со всех устройств.
    ...(blocked ? [db.session.deleteMany({ where: { userId } })] : []),
  ]);
  revalidatePath(`/admin/students/${userId}`);
  revalidatePath("/admin/students");
}

export async function resetPasswordAction(userId: string, _: StudentState): Promise<StudentState> {
  await assertAdmin();
  const password = generateTempPassword();
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { email: true } });
  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(password) } }),
    db.session.deleteMany({ where: { userId } }),
    db.authAttempt.deleteMany({ where: { key: `login:email:${user.email}` } }),
  ]);
  return { ok: "Новый пароль создан. Передайте его ученику — он показан один раз.", password };
}

export async function sendResetLinkAction(userId: string, _: StudentState): Promise<StudentState> {
  await assertAdmin();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Ученик не найден." };
  const token = newToken();
  await db.passwordResetToken.create({
    data: { tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
  });
  await sendMail({
    to: user.email,
    subject: "Доступ к личному кабинету",
    text: `Здравствуйте, ${user.name}!\n\nЧтобы задать пароль для входа в кабинет, откройте ссылку (действует 24 часа):\n${env.appUrl}/reset?token=${token}\n\nЛогин: ${user.email}`,
  });
  return { ok: `Письмо со ссылкой отправлено на ${user.email}.` };
}

export async function enrollAction(userId: string, formData: FormData) {
  await assertAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return;
  await db.enrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: { userId, courseId },
    update: {},
  });
  revalidatePath(`/admin/students/${userId}`);
}

export async function unenrollAction(enrollmentId: string) {
  await assertAdmin();
  const e = await db.enrollment.delete({ where: { id: enrollmentId } });
  revalidatePath(`/admin/students/${e.userId}`);
}

export async function updateEnrollmentAction(enrollmentId: string, _: StudentState, formData: FormData): Promise<StudentState> {
  await assertAdmin();
  const startedRaw = String(formData.get("startedAt") ?? "");
  const startedAt = startedRaw ? new Date(`${startedRaw}T00:00:00+03:00`) : null;
  if (startedRaw && Number.isNaN(startedAt?.getTime())) return { error: "Некорректная дата старта." };

  const e = await db.enrollment.update({
    where: { id: enrollmentId },
    data: {
      curatorName: String(formData.get("curatorName") ?? "").trim().slice(0, 80),
      curatorSchedule: String(formData.get("curatorSchedule") ?? "").trim().slice(0, 120),
      ...(startedAt ? { startedAt } : {}),
    },
  });
  revalidatePath(`/admin/students/${e.userId}`);
  return { ok: "Сохранено." };
}

/** AUTO — убрать ручное решение и вернуть правила курса. */
export async function setWeekAccessAction(enrollmentId: string, weekId: string, mode: "AUTO" | "OPEN" | "CLOSED") {
  await assertAdmin();
  if (mode === "AUTO") {
    await db.weekAccess.deleteMany({ where: { enrollmentId, weekId } });
  } else {
    await db.weekAccess.upsert({
      where: { enrollmentId_weekId: { enrollmentId, weekId } },
      create: { enrollmentId, weekId, mode },
      update: { mode, changedAt: new Date() },
    });
  }
  const e = await db.enrollment.findUnique({ where: { id: enrollmentId }, select: { userId: true } });
  if (e) revalidatePath(`/admin/students/${e.userId}`);
}

/** Удаляет ученика вместе с записями на курсы и прогрессом. Себя удалить нельзя. */
export async function deleteStudentAction(userId: string) {
  const admin = await assertAdmin();
  if (admin.id === userId) throw new Error("Нельзя удалить самого себя");
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) redirect("/admin/students");
  await db.$transaction([
    db.authAttempt.deleteMany({ where: { key: `login:email:${user.email}` } }),
    db.user.delete({ where: { id: userId } }),
  ]);
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  redirect("/admin/students");
}
