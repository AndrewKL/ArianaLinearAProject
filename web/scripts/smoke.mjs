/**
 * Browser smoke test: loads the built site in headless Chrome and checks that
 * SQLite-wasm boots, the gzipped database inflates, and a query returns rows.
 *
 * Node cannot exercise that path, so it runs in a real browser or not at all.
 * Drives Chrome over the DevTools protocol directly — Node 22 ships a
 * WebSocket client, so this needs no dependencies. (`--dump-dom` is no use
 * here: it fires at load and aborts the request the test is waiting for.)
 *
 *   node scripts/smoke.mjs [url]
 *   CHROME=/path/to/chrome node scripts/smoke.mjs
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL_ = process.argv[2] ?? "http://localhost:4173/?selftest";
const TIMEOUT_MS = 60_000;

const profile = mkdtempSync(join(tmpdir(), "linear-a-smoke-"));
const chrome = spawn(CHROME, [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--no-first-run",
  "--remote-debugging-port=0",
  `--user-data-dir=${profile}`,
  "about:blank",
]);

function cleanup(code) {
  chrome.kill();
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
  process.exit(code);
}

const endpoint = await new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("Chrome did not start")), 20_000);
  let buffered = "";
  chrome.stderr.on("data", (chunk) => {
    buffered += chunk;
    const match = /DevTools listening on (ws:\/\/\S+)/.exec(buffered);
    if (match) {
      clearTimeout(timer);
      resolve(match[1]);
    }
  });
}).catch((error) => {
  console.error(`smoke: ${error.message}`);
  cleanup(1);
});

const socket = new WebSocket(endpoint);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 1;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  const waiter = pending.get(message.id);
  if (waiter) {
    pending.delete(message.id);
    message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
  }
});

function send(method, params = {}, sessionId) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params, sessionId }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

const { targetId } = await send("Target.createTarget", { url: URL_ });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });

async function evaluate(expression) {
  const { result } = await send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
  return result.value;
}

const started = Date.now();
let title = "";
let status = "";
while (Date.now() - started < TIMEOUT_MS) {
  await new Promise((r) => setTimeout(r, 250));
  title = (await evaluate("document.title")) ?? "";
  if (title.startsWith("SELFTEST")) break;
}
status = (await evaluate("document.querySelector('.status')?.textContent ?? ''")) ?? "";
const sites = await evaluate("document.querySelectorAll('.sites li').length");

if (!title.startsWith("SELFTEST OK") || !sites) {
  console.error(`smoke: FAILED\n  title:  ${title || "(timed out)"}\n  status: ${status}`);
  cleanup(1);
}

console.log(`smoke: ${title} — ${status}`);
cleanup(0);
