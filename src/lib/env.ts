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
    if (process.env.NODE_ENV === "production" && secret.length < 32) {
      throw new Error("APP_SECRET должен быть длиннее 32 символов");
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
