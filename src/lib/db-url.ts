import type { PoolConfig } from "pg";

/** Адрес для запросов сайта: свой DATABASE_URL или переменные интеграции Supabase в Vercel. */
export function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || "";
}

/** Прямое подключение (без pgbouncer) — для миграций и seed. */
export function directDatabaseUrl(): string {
  return process.env.DIRECT_URL || process.env.POSTGRES_URL_NON_POOLING || databaseUrl();
}

/**
 * Настройки node-postgres из строки подключения.
 * sslmode=require у Supabase: node-postgres трактует его как полную проверку сертификата,
 * а сертификат выпущен собственным CA Supabase — подключение падает. Поэтому:
 * - есть DATABASE_CA_CERT (сертификат из настроек проекта Supabase) — проверяем по нему;
 * - нет — шифруем без проверки цепочки, как делает psql при sslmode=require.
 */
export function pgConfig(raw: string, extra: PoolConfig = {}): PoolConfig {
  if (!raw) return { ...extra };
  const url = new URL(raw);
  const mode = url.searchParams.get("sslmode");
  for (const param of ["sslmode", "pgbouncer", "connection_limit", "supa", "sslrootcert"]) url.searchParams.delete(param);

  const local = ["localhost", "127.0.0.1"].includes(url.hostname);
  const wantsSsl = mode ? mode !== "disable" : !local;
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n");

  return {
    connectionString: url.toString(),
    ssl: wantsSsl ? (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }) : undefined,
    ...extra,
  };
}
