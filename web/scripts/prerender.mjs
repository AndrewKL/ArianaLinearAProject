/**
 * Render every route to a real HTML file.
 *
 * GitHub Pages has no rewrite rules, so a client-only SPA 404s on a cold
 * visit to /texts/io-za-2/. Prerendering also gives crawlers, link previews
 * and readers without JavaScript the actual text, and lets first paint happen
 * without waiting for a WebAssembly runtime and a database download.
 *
 * Reads the same web.db the browser will later fetch, through node:sqlite.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = resolve(here, "..");
const DB = join(web, "public", "data", "web.db");
const DIST = join(web, "dist");

if (!existsSync(DB)) {
  console.error(`missing ${DB}\nRun: python3 -m lineara site data`);
  process.exit(1);
}

const server = await import(join(web, "dist-ssr", "entry-server.js"));
const { marked } = await import("marked");
const { DatabaseSync } = await import("node:sqlite");

const handle = new DatabaseSync(DB, { readOnly: true });
const db = {
  all(sql, params = []) {
    return handle.prepare(sql).all(...params);
  },
};

const template = readFileSync(join(DIST, "index.html"), "utf8");

function routes() {
  const texts = db.all(
    `SELECT i.slug FROM inscriptions i
       JOIN (SELECT inscription_id, sum(n_signs) total FROM runs GROUP BY inscription_id) r
         ON r.inscription_id = i.id
      WHERE r.total >= 5 ORDER BY r.total DESC`
  );
  return ["/", "/about/", ...texts.map((t) => `/texts/${t.slug}/`)];
}

function write(route, html) {
  const out = route === "/" ? join(DIST, "index.html") : join(DIST, route, "index.html");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}

let count = 0;
// The about page is prose, authored once in docs/ and rendered here so the
// document and the published page cannot say different things.
const ABOUT_MD = resolve(web, "..", "docs", "who-were-the-minoans.md");
if (!existsSync(ABOUT_MD)) {
  console.error(`missing ${ABOUT_MD}`);
  process.exit(1);
}
const aboutHtml = marked.parse(readFileSync(ABOUT_MD, "utf8"), { async: false });

for (const route of routes()) {
  const data = route === "/about/" ? server.aboutData(aboutHtml) : server.pageData(db, route);
  if (!data) {
    console.warn(`no data for ${route}, skipped`);
    continue;
  }
  const html = template
    .replace("<!--app-title-->", escapeHtml(server.title(data)))
    .replace("<!--app-html-->", server.render(data))
    .replace(
      "<!--app-data-->",
      `<script>window.__PAGE__=${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`
    );
  write(route, html);
  count += 1;
}

// A cold visit to an unknown path should still land somewhere useful.
writeFileSync(join(DIST, "404.html"), readFileSync(join(DIST, "index.html"), "utf8"));
// Pages would otherwise run the output through Jekyll and drop files starting with _.
writeFileSync(join(DIST, ".nojekyll"), "");

console.log(`prerendered ${count} routes`);

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}
