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
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CANDIDATES = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].filter(Boolean);
const CHROME = CANDIDATES.find((path) => existsSync(path));
if (!CHROME) {
  console.error(`smoke: no browser found. Tried:\n  ${CANDIDATES.join("\n  ")}\nSet CHROME=/path/to/chrome`);
  process.exit(1);
}
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

async function waitFor(expression, description, timeout = 45_000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const value = await evaluate(expression);
    if (value) return value;
    await new Promise((r) => setTimeout(r, 250));
  }
  console.error(`smoke: timed out waiting for ${description}`);
  cleanup(1);
}

// 1. The home page runs a query against the database in the browser.
await waitFor("document.title.startsWith('SELFTEST') && document.title", "the in-browser query");
const title = await evaluate("document.title");
const status = (await evaluate("document.querySelector('.status')?.textContent ?? ''")) ?? "";
const sites = await evaluate("document.querySelectorAll('.sites li').length");
if (!title.startsWith("SELFTEST OK") || !sites) {
  console.error(`smoke: FAILED\n  title:  ${title}\n  status: ${status}`);
  cleanup(1);
}
console.log(`smoke: ${title} — ${status}`);

// 2. Selecting a word on a text page searches the corpus for it.
const textUrl = new URL("texts/io-za-2/", URL_.split("?")[0]).href;
await send("Page.enable", {}, sessionId);
await send("Page.navigate", { url: textUrl }, sessionId);
await waitFor("!!document.querySelector('button.form')", "the text page");
const clicked = await evaluate(
  `(() => {
     const target = [...document.querySelectorAll('button.form')]
       .find((b) => b.textContent.includes('ja-sa-sa-ra-me'));
     if (!target) return false;
     target.click();
     return true;
   })()`
);
if (!clicked) {
  console.error("smoke: FAILED — no ja-sa-sa-ra-me word button on the text page");
  cleanup(1);
}
await waitFor("document.querySelectorAll('.explore .hits li').length", "corpus hits");
const hits = await evaluate(
  "[...document.querySelectorAll('.explore .hits li a')].map(a => a.textContent).join(', ')"
);
const similar = await evaluate(
  "[...document.querySelectorAll('.explore .similar button')].map(b => b.textContent).join(', ')"
);
if (!hits.includes("PL Zf 1") || !similar.includes("sa-sa-ra-me")) {
  console.error(`smoke: FAILED — unexpected results\n  hits: ${hits}\n  similar: ${similar}`);
  cleanup(1);
}
console.log(`smoke: word search OK — also on: ${hits}`);
console.log(`smoke: similar forms: ${similar}`);

// 3. The about page is prose injected as HTML, so hydration is the risk:
// React would blow the content away on a mismatch. Check it survives.
const aboutUrl = new URL("about/", URL_.split("?")[0]).href;
await send("Page.navigate", { url: aboutUrl }, sessionId);
await waitFor("!!document.querySelector('.prose h1')", "the about page");
const about = await evaluate(
  `(() => {
     const h1 = document.querySelector('.prose h1');
     return JSON.stringify({
       heading: h1 ? h1.textContent : null,
       sections: document.querySelectorAll('.prose h2').length,
       tables: document.querySelectorAll('.prose table').length,
       sources: document.querySelectorAll('.prose a[href^="https://"]').length,
     });
   })()`
);
const shape = JSON.parse(about);
if (!shape.heading?.includes("Minoans") || shape.sections < 5 || shape.tables < 2) {
  console.error(`smoke: FAILED — about page did not survive hydration: ${about}`);
  cleanup(1);
}
console.log(
  `smoke: about page OK — ${shape.sections} sections, ${shape.tables} tables, ${shape.sources} links`
);
cleanup(0);
