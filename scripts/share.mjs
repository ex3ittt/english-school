// npm run share: временная публичная ссылка на сайт через Cloudflare Tunnel (без аккаунта).
// Ссылка работает, пока открыт этот терминал и включён компьютер.
// Если туннель оборвётся, скрипт сам поднимет новый и напечатает новую ссылку.
import "dotenv/config";
import { spawn } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { lookup } from "node:dns/promises";
import https from "node:https";
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

// Не даём Mac уснуть, пока раздаём сайт: во сне туннель рвётся. Только на время работы команды.
if (process.platform === "darwin") {
  spawn("caffeinate", ["-ims", "-w", String(process.pid)], { stdio: "ignore", detached: true }).unref();
}

let db = null;
let tunnel = null;
let site = null;
let stopping = false;

function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  try {
    // next start запускает дочерний next-server: гасим всю группу процессов, чтобы порт освободился.
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
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

/**
 * Адреса серверов Cloudflare узнаём через системный DNS macOS и передаём cloudflared готовыми.
 * Сам cloudflared читает /etc/resolv.conf, который на раздаче с iPhone бывает пустым —
 * тогда он теряет связь и ссылка отдаёт Error 1033.
 */
async function edgeAddresses() {
  const out = [];
  for (const host of ["region1.v2.argotunnel.com", "region2.v2.argotunnel.com"]) {
    try {
      const found = await lookup(host, { all: true, family: 4 });
      out.push(...found.slice(0, 4).map((a) => `${a.address}:7844`));
    } catch {}
  }
  return out;
}

/** Поднимает туннель и ждёт, пока Cloudflare подтвердит соединение. */
async function startTunnel() {
  const edges = await edgeAddresses();
  const args = ["tunnel", "--no-autoupdate", "--protocol", "http2", ...edges.flatMap((e) => ["--edge", e]), "--url", `http://localhost:${PORT}`];
  return new Promise((resolve, reject) => {
    const child = spawn("cloudflared", args, {
      stdio: ["ignore", "pipe", "pipe"],
      // Запрос новой ссылки — тоже через системный DNS.
      env: { ...process.env, GODEBUG: "netdns=cgo" },
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
        const err = new Error("Cloudflare временно отказал в новой ссылке (лимит на частые перезапуски).");
        err.rateLimited = true;
        reject(err);
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

// Проверяем ссылку через DNS Cloudflare (DNS-over-HTTPS): DNS раздачи с iPhone узнаёт новые адреса
// с опозданием, и по нему живая ссылка выглядела бы мёртвой.
async function resolvePublic(host) {
  for (const server of ["https://1.1.1.1/dns-query", "https://8.8.8.8/resolve"]) {
    try {
      const res = await fetch(`${server}?name=${host}&type=A`, {
        headers: { accept: "application/dns-json" },
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      const ip = (data.Answer ?? []).find((a) => a.type === 1)?.data;
      if (ip) return ip;
    } catch {}
  }
  return null;
}

async function publicOk(url) {
  try {
    const host = new URL(url).hostname;
    const ip = await resolvePublic(host);
    if (!ip) return false;
    return await new Promise((resolve) => {
      const req = https.get(
        { host: ip, servername: host, headers: { host }, path: "/login", timeout: 10_000 },
        (res) => {
          res.resume();
          resolve(res.statusCode === 200);
        },
      );
      req.on("timeout", () => req.destroy());
      req.on("error", () => resolve(false));
    });
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
    if (!stopping && !restarting && tunnel === t.child) void restart("cloudflared остановился.").then((u) => (current = u));
  });

  // Сайт должен знать свой публичный адрес: из него строятся ссылки на видео и в письмах.
  site = spawn("next", ["start", "-p", String(PORT)], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, APP_URL: url, NODE_ENV: "production" },
  });
  site.stdout.on("data", (c) => appendFileSync(LOG, String(c)));
  site.stderr.on("data", (c) => appendFileSync(LOG, String(c)));
  const thisSite = site;
  site.on("exit", (code) => {
    if (!stopping && !restarting && site === thisSite) {
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

let restarting = false;

async function restart(reason) {
  if (restarting) return current;
  restarting = true;
  console.log(`\n${reason} Поднимаю новую ссылку…`);
  try {
    for (let attempt = 1; ; attempt++) {
      stopChild(tunnel);
      stopChild(site);
      await sleep(1500);
      try {
        return await start();
      } catch (error) {
        const wait = error.rateLimited ? 90 : Math.min(attempt * 15, 60);
        console.error(`Не получилось: ${error.message} Пробую ещё раз через ${wait} с…`);
        await sleep(wait * 1000);
      }
    }
  } finally {
    restarting = false;
  }
}

let current;
try {
  current = await start();
} catch (error) {
  console.error(`\n${error.message}\n`);
  shutdown(1);
}

// Сторож: раз в минуту проверяем ссылку снаружи. Два провала подряд — туннель умер, поднимаем новый.
let failures = 0;
setInterval(async () => {
  if (stopping || restarting) return;
  if (await publicOk(current)) {
    failures = 0;
    return;
  }
  failures++;
  log(`CHECK FAILED ${failures} ${current}`);
  if (failures >= 2) {
    failures = 0;
    current = await restart("Туннель Cloudflare оборвался (так бывает с бесплатными ссылками).");
  }
}, 60_000);
