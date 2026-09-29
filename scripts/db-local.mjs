// Запуск локального Postgres (PGlite) с понятным сообщением, если он уже работает.
import { spawn } from "node:child_process";
import net from "node:net";

const PORT = 5433;

const busy = await new Promise((resolve) => {
  const socket = net.connect({ port: PORT, host: "127.0.0.1" });
  socket.once("connect", () => {
    socket.end();
    resolve(true);
  });
  socket.once("error", () => resolve(false));
});

if (busy) {
  console.log(`\nЛокальная база уже запущена на порту ${PORT} — второй раз запускать не нужно.`);
  console.log("Чтобы перезапустить её: pkill -f pglite-server, затем снова npm run db:local\n");
  process.exit(0);
}

console.log(`Запускаю локальную базу на порту ${PORT}. Не закрывайте этот терминал.\n`);
const child = spawn("pglite-server", ["--db=.pglite", `--port=${PORT}`, "--max-connections=10"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
child.on("exit", (code) => process.exit(code ?? 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
