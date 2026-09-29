"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { removeIfUnused } from "@/lib/storage/cleanup";

export type TeacherState = { error?: string; ok?: string };

function refresh() {
  revalidatePath("/admin/teachers");
  revalidatePath("/course", "layout");
}

export async function createTeacherAction(_: TeacherState, formData: FormData): Promise<TeacherState> {
  await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Укажите имя преподавателя." };
  const last = await db.teacher.aggregate({ _max: { sortOrder: true } });
  await db.teacher.create({
    data: { name: name.slice(0, 80), bio: String(formData.get("bio") ?? "").trim().slice(0, 600), sortOrder: (last._max.sortOrder ?? 0) + 1 },
  });
  refresh();
  return { ok: `${name} добавлен(а). Фото можно загрузить в списке.` };
}

export async function updateTeacherAction(id: string, _: TeacherState, formData: FormData): Promise<TeacherState> {
  await assertAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Укажите имя преподавателя." };
  await db.teacher.update({
    where: { id },
    data: { name: name.slice(0, 80), bio: String(formData.get("bio") ?? "").trim().slice(0, 600) },
  });
  refresh();
  return { ok: "Сохранено." };
}

export async function setTeacherPhotoAction(id: string, key: string | null) {
  await assertAdmin();
  const before = await db.teacher.findUnique({ where: { id }, select: { photoKey: true } });
  await db.teacher.update({ where: { id }, data: { photoKey: key } });
  if (before?.photoKey && before.photoKey !== key) await removeIfUnused([before.photoKey]);
  refresh();
}

export async function deleteTeacherAction(id: string) {
  await assertAdmin();
  const videos = await db.lessonVideo.findMany({ where: { teacherId: id }, select: { videoKey: true, posterKey: true } });
  const t = await db.teacher.delete({ where: { id } });
  await removeIfUnused([t.photoKey, ...videos.flatMap((v) => [v.videoKey, v.posterKey])]);
  refresh();
}

export async function reorderTeachersAction(ids: string[]) {
  await assertAdmin();
  await db.$transaction(ids.map((id, index) => db.teacher.update({ where: { id }, data: { sortOrder: index + 1 } })));
  refresh();
}
