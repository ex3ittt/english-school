// npm run dev: если сайт настроен на локальную базу и она не запущена — поднимаем её сами.
import "dotenv/config";
import { spawn } from "node:child_process";
import net from "node:net";

const children = [];

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function run(cmd, args) {
  const child = spawn(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  children.push(child);
  child.on("exit", (code) => shutdown(code ?? 0));
  return child;
}

function shutdown(code) {
  for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown(0));

let url;
try {
  url = new URL(process.env.DATABASE_URL ?? "");
} catch {
  url = null;
}
const localDb = url && ["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "5433";

if (localDb && !(await portOpen(5433))) {
  console.log("Локальная база не запущена — запускаю её вместе с сайтом.\n");
  run("pglite-server", ["--db=.pglite", "--port=5433", "--max-connections=10"]);
  for (let i = 0; i < 100 && !(await portOpen(5433)); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await portOpen(5433))) {
    console.error("Не удалось запустить локальную базу. Попробуйте отдельно: npm run db:local");
    shutdown(1);
  }
}

run("next", ["dev", ...process.argv.slice(2)]);
