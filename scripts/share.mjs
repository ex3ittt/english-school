// npm run share: временная публичная ссылка на сайт через Cloudflare Tunnel.
// Работает, пока открыт этот терминал и включён компьютер. Нужен установленный cloudflared.
import "dotenv/config";
import { spawn } from "node:child_process";
import net from "node:net";

const PORT = 3100;
const children = [];

const portOpen = (port) =>
  new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.once("connect", () => (s.end(), resolve(true)));
    s.once("error", () => resolve(false));
  });

function run(cmd, args, opts = {}) {
  const child = spawn(cmd, args, { stdio: opts.pipe ? ["ignore", "pipe", "pipe"] : "inherit", env: opts.env ?? process.env });
  children.push(child);
  child.on("exit", (code) => shutdown(code ?? 0));
  return child;
}

function shutdown(code) {
  for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown(0));

if (!(await portOpen(5433)) && /127\.0\.0\.1:5433|localhost:5433/.test(process.env.DATABASE_URL ?? "")) {
  console.log("Запускаю локальную базу…");
  run("pglite-server", ["--db=.pglite", "--port=5433", "--max-connections=10"], { pipe: true });
  for (let i = 0; i < 100 && !(await portOpen(5433)); i++) await new Promise((r) => setTimeout(r, 100));
}

console.log("Открываю туннель Cloudflare…");
const tunnel = run("cloudflared", ["tunnel", "--no-autoupdate", "--protocol", "http2", "--url", `http://localhost:${PORT}`], { pipe: true });
const url = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Cloudflare не выдал ссылку за 60 секунд")), 60_000);
  const onData = (chunk) => {
    const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      clearTimeout(timer);
      resolve(match[0]);
    }
  };
  tunnel.stdout.on("data", onData);
  tunnel.stderr.on("data", onData);
});

// Сайт должен знать свой публичный адрес: из него строятся ссылки на видео и письма.
run("next", ["start", "-p", String(PORT)], { env: { ...process.env, APP_URL: url, NODE_ENV: "production" } });
for (let i = 0; i < 150 && !(await portOpen(PORT)); i++) await new Promise((r) => setTimeout(r, 100));

console.log(`\n  Сайт открыт по ссылке:  ${url}\n  Ссылка живёт, пока открыт этот терминал. Остановить — Ctrl+C.\n`);
