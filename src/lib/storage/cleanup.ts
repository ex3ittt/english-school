import "server-only";
import { db } from "@/lib/db";
import { storage } from "./index";

/**
 * Удаляет объекты из хранилища, если на них больше никто не ссылается.
 * Вызывать ПОСЛЕ изменения записей в БД. Ошибки хранилища не ломают действие админа.
 */
export async function removeIfUnused(keys: (string | null | undefined)[]) {
  const unique = [...new Set(keys.filter((k): k is string => !!k))];
  for (const key of unique) {
    const [courses, teachers, videos, posters, blockVideos, blockPosters, files] = await Promise.all([
      db.course.count({ where: { coverKey: key } }),
      db.teacher.count({ where: { photoKey: key } }),
      db.lessonVideo.count({ where: { videoKey: key } }),
      db.lessonVideo.count({ where: { posterKey: key } }),
      db.lessonBlock.count({ where: { videoKey: key } }),
      db.lessonBlock.count({ where: { posterKey: key } }),
      db.lessonBlock.count({ where: { fileKey: key } }),
    ]);
    if (courses + teachers + videos + posters + blockVideos + blockPosters + files > 0) continue;
    try {
      await storage().remove(key);
    } catch (error) {
      console.warn(`[storage] не удалось удалить ${key}:`, error);
    }
  }
}
