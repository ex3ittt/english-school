import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

export const env = {
  get appUrl() {
    return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get appSecret() {
    const secret = required("APP_SECRET");
    if (process.env.NODE_ENV === "production" && (secret.length < 32 || secret.startsWith("change-me"))) {
      // Значение из .env.example публично: с ним можно подделать подписанные ссылки на файлы.
      throw new Error("Задайте свой APP_SECRET (openssl rand -base64 48), а не значение из .env.example");
    }
    return secret;
  },
  get mediaTtl() {
    return Math.max(60, Number(process.env.MEDIA_URL_TTL ?? 900));
  },
  get isProd() {
    return process.env.NODE_ENV === "production";
  },
};
