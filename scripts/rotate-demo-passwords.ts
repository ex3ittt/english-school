/** Новые случайные пароли для админа и тестовых учеников. Пишет их в .demo-accounts.txt (не попадает в git). */
import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { generateTempPassword, hashPassword } from "../src/lib/auth/password";
import { directDatabaseUrl, pgConfig } from "../src/lib/db-url";

const db = new PrismaClient({ adapter: new PrismaPg(pgConfig(directDatabaseUrl())) });
const lines: string[] = [];
for (const user of await db.user.findMany({ orderBy: { role: "asc" } })) {
  const password = generateTempPassword(12);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  await db.session.deleteMany({ where: { userId: user.id } });
  lines.push(`${user.role === "ADMIN" ? "Админ " : "Ученик"}  ${user.email}  ${password}`);
}
await writeFile(".demo-accounts.txt", `Доступы к демо-сайту (файл не попадает в git)\n\n${lines.join("\n")}\n`);
console.log(`Пароли обновлены для ${lines.length} аккаунтов, записаны в .demo-accounts.txt`);
await db.$disconnect();
