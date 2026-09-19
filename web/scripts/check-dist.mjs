/**
 * Guards the three promises the design doc makes about the built site.
 * Run after prerender; fails the build, not a review.
 *
 *  1. No unassigned or private-use code point reaches the HTML. lineara.xyz's
 *     damage mark alone appears 2,257 times in the corpus and renders as tofu.
 *  2. Every internal link resolves. Slugs are generated, and 77 ids contain
 *     characters that need escaping.
 *  3. Every Linear A run carries a transliteration, or the text is silent to
 *     a screen reader.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = resolve(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const BASE = process.env.BASE ?? "/";

// U+1076B damage mark, U+1076C-F lineara.xyz's own signs, U+FD1EB private use.
const FORBIDDEN = /[\u{1076B}-\u{1076F}\u{FD1EB}]/u;

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory()
      ? htmlFiles(path)
      : path.endsWith(".html")
        ? [path]
        : [];
  });
}

const failures = [];
const files = htmlFiles(DIST);

for (const file of files) {
  const html = readFileSync(file, "utf8");
  const name = file.slice(DIST.length + 1);

  const bad = html.match(FORBIDDEN);
  if (bad) {
    failures.push(`${name}: emits unassigned code point U+${bad[0].codePointAt(0).toString(16).toUpperCase()}`);
  }

  if (!/<title>[^<]+<\/title>/.test(html)) failures.push(`${name}: empty <title>`);

  // Linear A characters must sit in an aria-hidden glyph span, with a
  // transliteration cell alongside.
  const glyphs = [...html.matchAll(/<span class="glyph"[^>]*>([^<]*)<\/span>/g)];
  const linearA = /[\u{10600}-\u{1077F}]/u;
  for (const [tag, content] of glyphs) {
    if (linearA.test(content) && !tag.includes('aria-hidden="true"')) {
      failures.push(`${name}: Linear A glyph not aria-hidden`);
      break;
    }
  }
  const signCells = (html.match(/class="cell"/g) ?? []).length;
  const translits = (html.match(/class="translit/g) ?? []).length;
  if (signCells > 0 && translits < signCells) {
    failures.push(`${name}: ${signCells} sign cells but only ${translits} transliterations`);
  }

  for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
    if (!href.startsWith(BASE) || href.startsWith("//")) continue;
    const rel = href.slice(BASE.length).split(/[?#]/)[0];
    const target = rel === "" ? join(DIST, "index.html") : join(DIST, rel, "index.html");
    if (!existsSync(target) && !existsSync(join(DIST, rel))) {
      failures.push(`${name}: dead internal link ${href}`);
    }
  }
}

for (const asset of ["data/web.db.gz", "fonts/NotoSansLinearA-Regular.ttf", ".nojekyll", "404.html"]) {
  if (!existsSync(join(DIST, asset))) failures.push(`missing ${asset}`);
}

if (failures.length > 0) {
  console.error(`check-dist: ${failures.length} problem(s) in ${files.length} pages`);
  for (const failure of [...new Set(failures)].slice(0, 20)) console.error("  " + failure);
  process.exit(1);
}
console.log(`check-dist: ${files.length} pages pass`);
