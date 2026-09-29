import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaModels?: string };

// Список моделей текущего клиента: если схема поменялась (prisma generate),
// dev-сервер не должен держать старый клиент из памяти.
const models = JSON.stringify(Object.keys(Prisma.ModelName));

function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    // Serverless (Vercel): держим пул маленьким, соединения раздаёт pgbouncer Supabase.
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
  });
  return new PrismaClient({ adapter });
}

if (globalForPrisma.prisma && globalForPrisma.prismaModels !== models) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaModels = models;
}
