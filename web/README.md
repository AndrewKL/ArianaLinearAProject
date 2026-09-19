# The website

React over the corpus database, prerendered to static HTML. Design and
rationale: [`../docs/website-design.md`](../docs/website-design.md).

## Run it

```sh
# from the repository root, once: fetch the corpus and build the databases
python3 -m lineara build
python3 -m lineara site data      # -> web/public/data/web.db (+ .gz)

cd web
npm install
npm run dev                       # development server
npm run build                     # client + SSR bundle + prerender + checks
npm run preview                   # serve the build on :4173
npm run smoke                     # headless-browser test of the WebAssembly path
```

`BASE=/linear-a-seattle/ npm run build` builds for a GitHub Pages project site.

## How it fits together

```
lineara.db ──► python3 -m lineara site data ──► public/data/web.db(.gz)
                                                  │
                    ┌─────────────────────────────┴───────────────────┐
                    ▼                                                 ▼
        node:sqlite (prerender)                        sqlite-wasm (browser)
        scripts/prerender.mjs                          src/data/browser.ts
                    │                                                 │
                    └────────────► src/data/queries.ts ◄──────────────┘
                                   one set of queries
```

Both sides satisfy the same `Db` interface, so every query runs identically in
Node and in the browser. Pages are prerendered because GitHub Pages has no
rewrite rules — and because the text should be readable without JavaScript.

## Scripts that are not builds

- `scripts/check-dist.mjs` — fails the build if any unassigned code point
  reaches the HTML (the damage mark `U+1076B` appears 2,257 times in the
  corpus and renders as tofu), if an internal link is dead, if a page has no
  title, or if a Linear A glyph is missing its transliteration. Screen readers
  cannot pronounce Linear A, so that last one is an accessibility check.
- `scripts/smoke.mjs` — drives headless Chrome over the DevTools protocol and
  checks that sqlite-wasm boots, the database inflates and a query returns
  rows. Node cannot exercise that path. Set `CHROME=` to point at a browser.
  It loads `/?selftest`, which makes the page run its query on load.

## Layout

```
src/
  data/
    types.ts      shapes shared by both sides, including the Db interface
    queries.ts    every query the site runs
    node.ts       prerender adapter (node:sqlite)
    browser.ts    browser adapter (sqlite-wasm), gzip sniffing, SQLite header check
  pages/
    Home.tsx      corpus summary, featured texts, in-browser query
    Text.tsx      one face: signs, transliteration, readings
  App.tsx, main.tsx (hydrate), entry-server.tsx (render + route data)
public/
  fonts/          Noto Sans Linear A, SIL OFL 1.1 — see FONTS.md
  data/           generated, not committed
```

## Not yet built

The ledger layout for accounting tablets, word-level alignment highlighting,
search, word and sign pages, and the images panel. See the design doc's phases.
