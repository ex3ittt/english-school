import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Адрес хранилища (S3/R2/Supabase): туда браузер ходит за видео и загружает файлы.
const storageOrigin = (() => {
  try {
    return process.env.S3_ENDPOINT ? new URL(process.env.S3_ENDPOINT).origin : "";
  } catch {
    return "";
  }
})();
// У R2/S3 подписанные ссылки могут идти на поддомен бакета — разрешаем https: для медиа.
const media = ["'self'", "blob:", "https:", storageOrigin].filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src ${media} data:`,
  `media-src ${media}`,
  `connect-src 'self' https:${isDev ? " ws:" : ""}`,
  "font-src 'self' data:",
  "frame-src https://player.vimeo.com https://kinescope.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Прячем служебную кнопку Next.js в углу (видна только в режиме разработки). Ошибки всё равно покажутся.
  devIndicators: false,
  serverExternalPackages: ["pg", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "2mb" },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
