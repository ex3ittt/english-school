// npm run share: временная публичная ссылка на сайт через Cloudflare Tunnel (без аккаунта).
// Ссылка работает, пока открыт этот терминал и включён компьютер.
// Если туннель оборвётся, скрипт сам поднимет новый и напечатает новую ссылку.
import "dotenv/config";
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";

const PORT = 3100;
const LOG = ".share.log";
const URL_FILE = ".share-url";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const portOpen = (port) =>
  new Promise((resolve) => {
    const s = net.connect({ port, host: "127.0.0.1" });
    s.once("connect", () => (s.end(), resolve(true)));
    s.once("error", () => resolve(false));
  });

const log = (line) => appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`);

if (await portOpen(PORT)) {
  let url = "";
  try {
    url = readFileSync(URL_FILE, "utf8").trim();
  } catch {}
  console.log(`\nСайт уже раздаётся${url ? `: ${url}` : ""} — второй раз запускать не нужно.`);
  console.log("Чтобы перезапустить: закройте первый запуск (Ctrl+C) или выполните  pkill -f share.mjs\n");
  process.exit(0);
}

let db = null;
let tunnel = null;
let site = null;
let stopping = false;

function stopChild(child) {
  if (child && child.exitCode === null) child.kill("SIGTERM");
}

function shutdown(code = 0) {
  stopping = true;
  for (const c of [tunnel, site, db]) stopChild(c);
  process.exit(code);
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => shutdown(0));

if (!(await portOpen(5433)) && /(127\.0\.0\.1|localhost):5433/.test(process.env.DATABASE_URL ?? "")) {
  console.log("Запускаю локальную базу…");
  db = spawn("pglite-server", ["--db=.pglite", "--port=5433", "--max-connections=10"], { stdio: "ignore" });
  for (let i = 0; i < 100 && !(await portOpen(5433)); i++) await sleep(100);
}

/** Поднимает туннель и ждёт, пока Cloudflare подтвердит соединение. */
function startTunnel() {
  return new Promise((resolve, reject) => {
    const child = spawn("cloudflared", ["tunnel", "--no-autoupdate", "--protocol", "http2", "--url", `http://localhost:${PORT}`], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let url = null;
    const timer = setTimeout(() => reject(new Error("Cloudflare не выдал ссылку за 60 секунд")), 60_000);
    const onData = (chunk) => {
      const text = String(chunk);
      appendFileSync(LOG, text);
      // Ссылка на сайт — в рамке «Your quick Tunnel has been created». api.trycloudflare.com — служебный адрес.
      const match = text.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !url) url = match[0];
      if (/failed to (request|unmarshal) quick Tunnel|429 Too Many Requests/i.test(text)) {
        clearTimeout(timer);
        reject(new Error("Cloudflare отказал в новом туннеле (так бывает при частых перезапусках). Подождите минуту и запустите снова."));
      }
      if (url && /Registered tunnel connection/.test(text)) {
        clearTimeout(timer);
        resolve({ child, url });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", () => {
      clearTimeout(timer);
      reject(new Error("cloudflared завершился раньше времени — подробности в .share.log"));
    });
  });
}

async function publicOk(url) {
  try {
    const res = await fetch(`${url}/login`, { redirect: "manual", signal: AbortSignal.timeout(10_000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function start() {
  console.log("Открываю туннель Cloudflare…");
  const t = await startTunnel();
  tunnel = t.child;
  const url = t.url;
  // cloudflared упал совсем — сразу поднимаем заново, не дожидаясь сторожа.
  tunnel.on("exit", () => {
    if (!stopping && tunnel === t.child) void restart("cloudflared остановился.").then((u) => (current = u));
  });

  // Сайт должен знать свой публичный адрес: из него строятся ссылки на видео и в письмах.
  site = spawn("next", ["start", "-p", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, APP_URL: url, NODE_ENV: "production" },
  });
  site.stdout.on("data", (c) => appendFileSync(LOG, String(c)));
  site.stderr.on("data", (c) => appendFileSync(LOG, String(c)));
  site.on("exit", (code) => {
    if (!stopping) {
      console.error(`Сервер сайта остановился (код ${code}). Подробности в ${LOG}`);
      shutdown(1);
    }
  });

  console.log("Проверяю, что ссылка открывается снаружи…");
  let ok = false;
  for (let i = 0; i < 30 && !ok; i++) {
    ok = await publicOk(url);
    if (!ok) await sleep(2000);
  }
  if (!ok) throw new Error("Ссылка не открылась за минуту. Проверьте интернет; подробности в .share.log");

  writeFileSync(URL_FILE, url);
  log(`ONLINE ${url}`);
  console.log(`\n  Сайт открыт по ссылке:  ${url}\n  Работает, пока открыт этот терминал. Остановить — Ctrl+C.\n`);
  return url;
}

async function restart(reason) {
  console.log(`\n${reason} Поднимаю новую ссылку…`);
  stopping = true;
  stopChild(tunnel);
  stopChild(site);
  await sleep(1500);
  stopping = false;
  for (let attempt = 1; ; attempt++) {
    try {
      return await start();
    } catch (error) {
      console.error(`Не получилось (${error.message}). Пробую ещё раз через ${attempt * 15} с…`);
      stopChild(tunnel);
      stopChild(site);
      await sleep(attempt * 15_000);
    }
  }
}

let current;
try {
  current = await start();
} catch (error) {
  console.error(`\n${error.message}\n`);
  shutdown(1);
}

// Сторож: раз в минуту проверяем ссылку снаружи. Три провала подряд — туннель умер, поднимаем новый.
let failures = 0;
setInterval(async () => {
  if (stopping) return;
  if (await publicOk(current)) {
    failures = 0;
    return;
  }
  failures++;
  log(`CHECK FAILED ${failures} ${current}`);
  if (failures >= 3) {
    failures = 0;
    current = await restart("Туннель Cloudflare оборвался (так бывает с бесплатными ссылками).");
  }
}, 60_000);
