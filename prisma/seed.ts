/**
 * Тестовые данные: 1 админ, 2 ученика, основной курс на 8 недель, 2 преподавателя.
 * Запуск: npm run db:seed  (повторно — с SEED_RESET=1, чтобы очистить базу).
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";
import { createLocalDriver } from "../src/lib/storage/local";
import { createS3Driver } from "../src/lib/storage/s3";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL }) });

const storage =
  process.env.STORAGE_DRIVER === "s3"
    ? createS3Driver({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || "auto",
        bucket: process.env.S3_BUCKET!,
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
      })
    : createLocalDriver(process.env.APP_SECRET ?? "", process.env.APP_URL ?? "");

const DAY = 24 * 60 * 60 * 1000;

/** Минимальный PDF-листок, чтобы проверить блок «Файл». */
function samplePdf(title: string) {
  const text = `BT /F1 22 Tf 72 740 Td (${title}) Tj 0 -36 Td /F1 12 Tf (Placeholder worksheet. Replace with your own materials.) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  out += offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("");
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

const WEEK_TOPICS = [
  "Знакомство и глагол to be",
  "Present Simple: мой день",
  "Семья, дом, описание людей",
  "Еда, покупки, счётные слова",
  "Past Simple: что было вчера",
  "Путешествия и направления",
  "Планы: going to и will",
  "Повторение и мини-тест",
];

const DAY_LESSONS: Record<number, string> = {
  1: "Грамматика недели",
  2: "Словарь и произношение",
  3: "Слушаем и понимаем",
  4: "Говорим: диалоги",
  5: "Письмо и чтение",
  6: "Повторение недели",
};

async function main() {
  const existing = await db.user.count();
  if (existing > 0 && process.env.SEED_RESET !== "1") {
    console.log("В базе уже есть данные. Чтобы пересоздать тестовые данные: SEED_RESET=1 npm run db:seed");
    return;
  }
  if (existing > 0) {
    console.log("Очищаю базу…");
    await db.$transaction([
      db.progress.deleteMany(),
      db.weekAccess.deleteMany(),
      db.enrollment.deleteMany(),
      db.lessonVideo.deleteMany(),
      db.lessonBlock.deleteMany(),
      db.lesson.deleteMany(),
      db.day.deleteMany(),
      db.week.deleteMany(),
      db.course.deleteMany(),
      db.teacher.deleteMany(),
      db.session.deleteMany(),
      db.passwordResetToken.deleteMany(),
      db.user.deleteMany(),
    ]);
  }

  console.log("Загружаю тестовое видео и файлы в хранилище…");
  const assets = path.join(process.cwd(), "prisma", "seed-assets");
  const videoKey = "videos/seed-sample-lesson.mp4";
  const posterKey = "images/seed-sample-poster.jpg";
  await storage.put(videoKey, await readFile(path.join(assets, "sample-lesson.mp4")), "video/mp4");
  await storage.put(posterKey, await readFile(path.join(assets, "sample-poster.jpg")), "image/jpeg");
  const pdfKeys: string[] = [];
  for (let w = 1; w <= 8; w++) {
    const key = `files/seed-week-${w}-homework.pdf`;
    await storage.put(key, samplePdf(`Week ${w}: homework`), "application/pdf");
    pdfKeys.push(key);
  }

  console.log("Пользователи…");
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@school.local").toLowerCase();
  const studentPassword = await hashPassword(process.env.SEED_STUDENT_PASSWORD ?? "student12345");
  await db.user.create({
    data: {
      email: adminEmail,
      name: "Администратор",
      role: "ADMIN",
      passwordHash: await hashPassword(process.env.SEED_ADMIN_PASSWORD ?? "admin12345"),
    },
  });
  const anna = await db.user.create({
    data: { email: "anna@student.local", name: "Анна Соколова", passwordHash: studentPassword, lastSeenAt: new Date() },
  });
  const ivan = await db.user.create({
    data: {
      email: "ivan@student.local",
      name: "Иван Орлов",
      passwordHash: studentPassword,
      lastSeenAt: new Date(Date.now() - 12 * DAY),
    },
  });

  console.log("Преподаватели…");
  const t1 = await db.teacher.create({
    data: {
      name: "Мария Лебедева",
      bio: "Объясняет грамматику через живые примеры и короткие упражнения. Подойдёт, если хочется разложить всё по полочкам.",
      sortOrder: 1,
    },
  });
  const t2 = await db.teacher.create({
    data: {
      name: "Daniel Brooks",
      bio: "Носитель языка из Манчестера. Урок почти целиком на английском, с субтитрами и разбором фраз в конце.",
      sortOrder: 2,
    },
  });

  console.log("Основной курс на 8 недель…");
  const main = await db.course.create({
    data: {
      title: "Английский: уверенная база",
      level: "Elementary",
      levelCode: "A2",
      description:
        "Восемь недель: каждый будний день — короткий урок с преподавателем, воркшоп и домашнее задание. В субботу — повторение.",
      isMain: true,
      autoUnlock: true,
      sortOrder: 1,
    },
  });

  const lessonIdsByWeek: string[][] = [];
  for (let w = 1; w <= 8; w++) {
    const week = await db.week.create({ data: { courseId: main.id, number: w, title: WEEK_TOPICS[w - 1] } });
    const ids: string[] = [];
    for (let d = 1; d <= 7; d++) {
      const day = await db.day.create({ data: { weekId: week.id, dayOfWeek: d } });
      const title = DAY_LESSONS[d];
      if (!title) continue; // воскресенье — выходной
      const lesson = await db.lesson.create({
        data: {
          dayId: day.id,
          title,
          summary: d === 6 ? "Короткий обзор всего, что прошли за неделю." : `Тема недели: ${WEEK_TOPICS[w - 1]}.`,
          sortOrder: 1,
          videos: {
            create: [
              { teacherId: t1.id, provider: "UPLOAD", videoKey, posterKey, durationSec: 12 },
              { teacherId: t2.id, provider: "UPLOAD", videoKey, posterKey, durationSec: 12 },
            ],
          },
          blocks: {
            create:
              d === 6
                ? [
                    {
                      type: "TEXT",
                      title: "Чек-лист недели",
                      sortOrder: 1,
                      text: "Пересмотрите конспект.\nСделайте мини-тест в PDF.\nЗапишите голосовое на 1 минуту по теме недели и отправьте куратору.",
                    },
                    { type: "FILE", title: "Мини-тест", sortOrder: 2, fileKey: pdfKeys[w - 1], fileName: `Неделя ${w} — мини-тест.pdf`, fileSize: 900 },
                  ]
                : [
                    {
                      type: "VIDEO",
                      title: "Грамматический воркшоп",
                      sortOrder: 1,
                      videoProvider: "UPLOAD",
                      videoKey,
                      posterKey,
                    },
                    {
                      type: "TEXT",
                      title: "Домашнее задание",
                      sortOrder: 2,
                      text: "1. Выполните упражнения из PDF.\n2. Составьте пять своих предложений по теме урока.\n3. Пришлите фото или файл куратору до следующего занятия.",
                    },
                    {
                      type: "FILE",
                      title: "Рабочий лист",
                      sortOrder: 3,
                      fileKey: pdfKeys[w - 1],
                      fileName: `Неделя ${w} — рабочий лист.pdf`,
                      fileSize: 900,
                    },
                  ],
          },
        },
      });
      ids.push(lesson.id);
    }
    lessonIdsByWeek.push(ids);
  }

  console.log("Дополнительные курсы…");
  const extras = [
    { title: "Английский для путешествий", level: "Elementary", levelCode: "A2", weeks: 2 },
    { title: "Разговорный клуб", level: "Intermediate", levelCode: "B1", weeks: 0 },
    { title: "Произношение без акцента", level: "Beginner", levelCode: "A1", weeks: 0 },
    { title: "Деловая переписка", level: "Upper-Intermediate", levelCode: "B2", weeks: 0 },
  ];
  const extraCourses = [];
  for (const [i, e] of extras.entries()) {
    const course = await db.course.create({
      data: {
        title: e.title,
        level: e.level,
        levelCode: e.levelCode,
        description: "Дополнительный курс. Замените описание в админ-панели.",
        sortOrder: 10 + i,
      },
    });
    for (let w = 1; w <= e.weeks; w++) {
      const week = await db.week.create({ data: { courseId: course.id, number: w, title: w === 1 ? "В аэропорту и отеле" : "В городе" } });
      const day = await db.day.create({ data: { weekId: week.id, dayOfWeek: 1 } });
      await db.lesson.create({
        data: {
          dayId: day.id,
          title: "Полезные фразы",
          sortOrder: 1,
          videos: { create: [{ teacherId: t2.id, provider: "UPLOAD", videoKey, posterKey }] },
          blocks: { create: [{ type: "TEXT", title: "Фразы урока", sortOrder: 1, text: "Could you help me, please?\nWhere is the check-in desk?\nI'd like to book a room for two nights." }] },
        },
      });
    }
    extraCourses.push(course);
  }

  console.log("Записи на курсы и прогресс…");
  await db.enrollment.create({
    data: {
      userId: anna.id,
      courseId: main.id,
      startedAt: new Date(Date.now() - 15 * DAY),
      curatorName: "Ольга Власова",
      curatorSchedule: "Вт и Чт, 19:00 (МСК)",
      preferredTeacherId: t1.id,
    },
  });
  await db.enrollment.create({ data: { userId: anna.id, courseId: extraCourses[0].id, startedAt: new Date(Date.now() - 3 * DAY) } });
  const ivanEnrollment = await db.enrollment.create({
    data: {
      userId: ivan.id,
      courseId: main.id,
      startedAt: new Date(Date.now() - 2 * DAY),
      curatorName: "Дмитрий Шестаков",
      curatorSchedule: "Пн и Ср, 20:30 (МСК)",
    },
  });
  // Ивану вторую неделю открыли вручную раньше срока.
  const ivanWeek2 = await db.week.findFirstOrThrow({ where: { courseId: main.id, number: 2 } });
  await db.weekAccess.create({ data: { enrollmentId: ivanEnrollment.id, weekId: ivanWeek2.id, mode: "OPEN" } });

  const annaDone = [...lessonIdsByWeek[0], ...lessonIdsByWeek[1], ...lessonIdsByWeek[2].slice(0, 2)];
  await db.progress.createMany({
    data: annaDone.map((lessonId, i) => ({ userId: anna.id, lessonId, completedAt: new Date(Date.now() - (15 - i * 0.9) * DAY) })),
  });
  await db.progress.createMany({ data: lessonIdsByWeek[0].slice(0, 1).map((lessonId) => ({ userId: ivan.id, lessonId })) });

  console.log(`\nГотово.
  Админ:    ${adminEmail} / ${process.env.SEED_ADMIN_PASSWORD ?? "admin12345"}
  Ученики:  anna@student.local, ivan@student.local / ${process.env.SEED_STUDENT_PASSWORD ?? "student12345"}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
