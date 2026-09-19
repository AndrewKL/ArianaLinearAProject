# Design doc: a browsable Linear A corpus website

Status: draft for review. Stack decided: **React over a SQLite database
compiled to WebAssembly, prerendered and served from GitHub Pages**
(see [Stack](#stack-react-sqlite-in-the-browser-github-pages)).

## What it is

A public website for reading the Linear A corpus. Every inscribed face gets a
view with three layers:

1. **The text**, in Linear A characters
2. **Transliteration**, the conventional sound values, sign by sign
3. **Suggested meanings**, per word, showing every recorded proposal with its
   source and how strong the claim is

Data comes from `lineara.db` in this repository: 1,884 faces, 1,101 distinct
words, 20 readings from 2 sources.

## Who it is for

- **Curious readers** arriving from a news story about a "deciphered" Minoan
  prayer. They want to see the object and know what is actually known.
- **Students and enthusiasts** who want to look up a word and see everywhere
  it occurs.
- **Specialists**, who will not use this as a source of record (GORILA, SigLA
  and RILA are), but may use it to check where a word recurs.

The design brief for all three: *show what is known, show who claims what, and
never let a guess look like a fact.*

## Two facts that shape everything

**1. Most faces have almost no text.**

| Syllabic signs on the face | Faces |
|---|---|
| 0 | 365 |
| 1 | 965 |
| 2–4 | 256 |
| 5–9 | 155 |
| 10+ | 143 |

913 of the 1,884 faces are nodules, most carrying a single sign. Only **298
faces have five or more signs**. A site of 1,884 equal pages would be 1,586
nearly empty ones. So:

- Faces with ≥2 signs get a **full text page**.
- Single-sign and blank faces are **listed in grouped index pages**
  (by site, by sign, by object type) and are reachable by direct URL, but do
  not get a promoted page. A nodule page is one sign, its role, and what else
  that sign appears on.

**2. The translation section is usually empty.**

Readings exist for **15 of 1,101 distinct words**, covering **107 of 1,740
word instances (6%)**. On a typical page, every word will say "no reading
recorded".

This is the central design problem. An empty section reads as a broken
website, and the temptation is to fill it with something. We do not. Instead,
the third layer answers a question it *can* answer for every word:

> **Where else does this word appear?**

Attestation is real information, it exists for every word, and it is exactly
the evidence a reader needs to judge any proposed meaning. So the third layer
is headed **"Meaning and attestation"**, and for a word with no reading it
shows the distribution: "U-NA-RU-KA-NA-TI — no reading recorded. Appears once,
at Palaikastro." That is an honest, informative answer, not an empty state.

## Information architecture

```
/                         Home: what Linear A is, what is known, entry points
/texts                    All texts, filterable by site, object type, period, length
/texts/io-za-2            One face: the three layers            ← the core page
/words                    Word index, by frequency
/words/ku-ro              One word: every attestation, all readings, similar forms
/signs                    Sign chart: 402 signs, glyph, value, frequency
/signs/ab57               One sign: glyph, values, where it occurs
/sites/iouktas            One site: its texts, with a note on context
/readings                 Every recorded reading, by source, with confidence
/sources/schumann-2026    One source: what it claims, across all texts
/about                    Data provenance, licences, how to cite, how to contribute
```

`/words/ku-ro` and `/sources/…` are what make the site worth building. A
translation claim is only checkable across the whole corpus, and these pages
are that check. The news-story reader who lands on `/texts/io-za-2` can click
JA-SA-SA-RA-ME and immediately see it on six other objects from five sites.

## The text page

The core page. Wireframe for a running text (IO Za 2):

```
┌──────────────────────────────────────────────────────────────────────┐
│ IO Za 2                                        Iouktas · stone vessel │
│ Libation table, peak sanctuary of Mount Iouktas                       │
│ GORILA 4 p. 8 · HM 3642                                    [ Cite ]   │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  𐘇𐘳𐘚𐙕𐘮𐘱  ·  𐘱𐘆𐘸𐘹  ·  𐘱𐘞𐘞𐘴¦𐘋  ·  𐘉𐘅𐘾𐘅¦𐘤¦        │
│  a-ta-i-*301-wa-ja  ja-di-ki-tu   ja-sa-sa-ra-me   u-na-ka-na-si      │
│  ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌  ╌╌╌╌╌╌╌╌╌╌╌   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌                      │
│                                                                       │
│  ¦𐘚𐘢𐘅𐙁  ·  𐘤𐘘𐘃  ·  𐘳𐘅𐘴𐘃𐘉𐘠𐘯  ·  𐘚¦                        │
│  i-pi-na-ma   si-ru-te   ta-na-ra-te-u-ti-nu   i…                     │
│  ╌╌╌╌╌╌╌╌╌    ╌╌╌╌╌╌╌╌   ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌                         │
│                                                                       │
│                          [ Copy Linear A ] [ Copy transliteration ]   │
├──────────────────────────────────────────────────────────────────────┤
│ MEANING AND ATTESTATION                                               │
│                                                                       │
│ a-ta-i-*301-wa-ja                       11 texts · 5 sites  →         │
│   ▰▰▰▰ established   opening element of the libation formula;         │
│                      meaning unknown                — conventional    │
│   ▱▱▱▱ speculative   "Father of the Bull-Contest"                     │
│                      — Schümann 2026 · preprint, not peer-reviewed    │
│                      Reads *301 as JO; *301 has no agreed value.      │
│                                                                       │
│ ja-di-ki-tu                              only here          →         │
│   ▰▰▰▱ widely accepted  Dikte (place name)          — conventional    │
│   ▱▱▱▱ speculative      "from Dikte"          — Schümann 2026 · …     │
│                                                                       │
│ ta-na-ra-te-u-ti-nu                      only here          →         │
│   ⚠ Schümann 2026 splits this into three words. There is no word      │
│     divider here on the stone. Readings below are for parts:          │
│   ▱▱▱▱ ta-na-ra "sanctuary" · te-u "of the god" · ti-nu "Tinu…"       │
│                                                                       │
│ Proposed as a continuous text                                         │
│   "Father of the Bull-Contest of Dikte, weep the tears; may the       │
│    libation offering flow in streams in the sanctuary of the god      │
│    Tinu and Ida-Mate."                                                │
│    — Schümann 2026, preprint, not peer-reviewed. This is one          │
│      proposal; Linear A is undeciphered. [What this rests on]         │
└──────────────────────────────────────────────────────────────────────┘
```

### Alignment model

The three layers align on the **sign**, not the word. Each sign carries an
index; the transliteration syllable under it carries the same index; the word
block carries the list of indices it spans. Hovering or tapping any one
highlights the other two. This is what lets a reader see that `𐙕` is the
sign read `*301`, and that it has no sound value.

Implementation note: an interlinear layout must not wreck text selection.
Render each word as an inline-block group, glyph row above transliteration
row, and provide explicit copy buttons per layer rather than relying on
selection order.

### The two genres

A single layout cannot serve both document types, and the corpus is mostly
the second:

**Running text** (stone vessels, ~63 faces): the formula. Word-flow layout as
above.

**Ledger** (tablets and roundels, ~700 faces; 352 faces contain numerals):
these are accounts. Rendering them as running prose hides their structure.
They get a table:

```
  HT 13                                     Haghia Triada · tablet
  ┌─────────────┬──────────┬────────┬────────────────────────────┐
  │ entry       │ commodity│ number │                            │
  ├─────────────┼──────────┼────────┼────────────────────────────┤
  │ ka-u-de-ta  │ VIN      │        │                            │
  │ re-za       │          │  5 J   │                            │
  │ te-tu       │          │ 56     │                            │
  │ te-ki       │          │ 27 J   │                            │
  │ ku-zu-ni    │          │ 18     │                            │
  │ da-si-*118  │          │ 19     │                            │
  │ i-du-ne-si  │          │  5     │                            │
  ├─────────────┼──────────┼────────┼────────────────────────────┤
  │ ku-ro       │          │ 130 J  │ total ▰▰▰▱ widely accepted │
  └─────────────┴──────────┴────────┴────────────────────────────┘
     The whole-number entries above sum to 130, matching KU-RO.
     This is the evidence for reading KU-RO as "total".
```

Fractions keep their sign label (`J`, `E`), not a numeric value. The values of
the Linear A fraction signs are themselves proposals, and HT 13 shows why the
distinction matters: the whole numbers sum exactly to the KU-RO figure, while
the two `J` signs do not reconcile with reading `J` as ½ against a total of
`130 J`. Show the signs; offer any numeric value as a reading, with its source.

The ledger view should **show the arithmetic**, because on these tablets the
arithmetic is the strongest evidence anyone has about meaning. Where the
entries sum to the KU-RO figure, say so. Where they do not (HT 122: 31 + 65 =
96 against PO-TO-KU-RO 97), say that too. Never silently "correct" it.

Genre is chosen by a rule, stored in the export: `ledger` if the face has
numerals or logograms in list position, else `running`. Faces of ≤1 sign use
the compact view.

### Images: facsimile and photograph

lineara.xyz carries two images for most faces: a photograph (`-Inscription`)
and the GORILA facsimile drawing (`-Facsimile`). 3,481 files, 141 MB, average
39 KB — they are already web-sized. **537 of the 554 faces that get a full
text page have at least one image**, 79 MB in total.

```
┌────────────────────────────────┬─────────────────────┐
│  𐘇𐘳𐘚𐙕𐘮𐘱 · 𐘱𐘆𐘸𐘹 · …      │  ┌───────────────┐  │
│  a-ta-i-*301-wa-ja  ja-di-ki-tu│  │   facsimile   │  │
│                                │  │    drawing    │  │
│  MEANING AND ATTESTATION       │  └───────────────┘  │
│  …                             │  ┌───────────────┐  │
│                                │  │  photograph   │  │
│                                │  └───────────────┘  │
│                                │  GORILA 4 p. 8      │
│                                │  © EFA · source ↗   │
└────────────────────────────────┴─────────────────────┘
```

- **Facsimile first.** The drawing is what the transliteration was read from,
  and it stays legible at small sizes; the photograph is the evidence behind
  the drawing. On narrow screens the panel moves below the text.
- Click to enlarge. `loading="lazy"`, explicit `width`/`height` to avoid
  layout shift, and a credit line attached to each image, not to the page.
- Alt text describes the object and refers the reader to the transliteration
  ("Stone libation table, inscribed on two faces; text transcribed below"),
  never "image of an inscription".
- **Images are an optional layer**, switched by one build flag
  (`images: none | local | published`), because the rights question below is
  unresolved and must not be wired into the templates. The site has to be
  correct and complete without them.

## Typography and the three token types

The transliteration layer must not make everything look like a spoken word.
Three token types, three treatments, following scholarly convention:

| Type | Example | Rendering |
|---|---|---|
| Syllabogram | ku-ro | lowercase, hyphen-joined |
| Sign with no agreed value | \*301, \*118 | lowercase with asterisk, in a muted tone, with a tooltip: "no agreed sound value" |
| Logogram | GRA, VIN, OLE | small caps, uppercase |
| Numeral | 130, ½ | digits, tabular figures |

This is the convention used in Linear B and Linear A editions, and it does
useful work here: a reader can see at a glance that `da-si-*118` is two
syllables plus an unknown, and that `VIN 5` is a commodity and a quantity, not
speech.

Note: the CLI in this repository displays transliteration in uppercase
(`A-TA-I-*301-WA-JA`). The website uses the lowercase convention. Both derive
from the same sign-id key; only presentation differs.

### Font

Linear A is outside the Basic Multilingual Plane and will render as tofu
without a font that covers it.

- Self-host **Noto Sans Linear A** as WOFF2, subset to U+10600–U+1077F, with
  `font-display: swap` and a `unicode-range` descriptor.
- Aegean numerals and word dividers (U+10100–U+1013F) are a **separate block**
  and need a second font. lineara.xyz ships exactly two font files for this,
  `NotoSansLinearA-LinearB.ttf` and `NotoSansSymbols2-Regular.ttf`, which is
  good evidence that Noto Sans Symbols 2 is the one that covers the Aegean
  block. Confirm by subsetting before committing to it; if the numeral glyphs
  turn out to be unavailable, render numerals as digits, which is what the
  transliteration layer does anyway.
- Glyphs are intricate. Set the Linear A layer at ~2rem minimum with generous
  `letter-spacing`; do not let it inherit body size.
- Run a **font load check**: if the font fails, show a one-line notice above
  the text rather than a page of boxes. Never let tofu be the reader's first
  impression.

### Characters that no font can render

Three code points in `unicode_text` are not assignable to a glyph, and the
site must convert them rather than emit them:

| Code point | What it is | Render as |
|---|---|---|
| U+1076B | lineara.xyz's damage/uncertainty mark (unassigned in Unicode) | `¦` styled mark, with tooltip "damaged or uncertain here"; excluded from copied text and from matching |
| U+1076C–U+1076F | lineara.xyz's own signs \*809–\*811, \*829 (unassigned) | labelled placeholder box showing the sign number |
| U+FD1EB | private use, stands for \*164 on HT 17 | render as the \*164 sign |

This is not optional polish. These characters appear in 2,257 places in the
corpus, and emitting them raw produces tofu in the middle of words.

## Showing confidence

Four levels, from the database: `established`, `widely-accepted`, `debated`,
`speculative`. Each reading shows level, gloss, source, and — when the source
is not peer-reviewed — that fact, inline, not in a footnote.

Encoding rules:

- **Never colour alone.** A filled-bar glyph (▰▰▰▱) plus the written label.
- Level describes **the claim, not the source**: a peer-reviewed paper can
  make a speculative claim, and a compilation can carry an established one.
- Sort by confidence descending, so the conventional reading appears above a
  novel one.
- `established` on a formula element means "we are sure of its role, not its
  meaning", and the gloss says so. Do not let the strong label imply a known
  translation.
- Any full-sentence translation is presented as **one source's proposal**,
  attributed in the same breath, never as the page's own voice.

The `basis` field from the readings file is shown behind a "What this rests
on" disclosure. For the conventional readings this is checkable evidence
(the HT 13 sum); for speculative ones it is usually the absence of evidence,
which is equally worth showing.

## Stack: React, SQLite in the browser, GitHub Pages

| Layer | Choice |
|---|---|
| UI | React + TypeScript, built with Vite |
| Data | `@sqlite.org/sqlite-wasm`: the corpus database fetched once and queried in the browser |
| Pages | Every route prerendered to real HTML at build time, then hydrated |
| Routing | React Router, with prerendered entry files and a `404.html` fallback |
| Styling | Hand-written CSS modules |
| Deploy | GitHub Actions → `upload-pages-artifact` + `deploy-pages` |
| Data build | The existing Python pipeline, which emits `web.db` |

### Why SQLite in the browser

- **The queries already exist.** Attestation, sub-sequence containment and
  the confidence ordering are SQL in the CLI today, and they transfer to the
  site unchanged. One query language across the terminal and the web, one
  place where "where else does this word occur" is defined.
- **It is smaller than the JSON it replaces.** Measured: the database with
  the `raw` column dropped is **380 KB gzipped**. Per-text JSON files plus a
  separate search index would total more and duplicate the same rows.
- **Search becomes a query, not an index.** Matching is on sign-id keys
  (`instr(' ' || key || ' ', ' ' || ? || ' ')`), which works verbatim in the
  browser. A JavaScript search library would tokenize `*301` and astral
  glyphs wrongly; see [Search](#search).
- **Nothing to operate.** The database is read-only and versioned with the
  corpus. Pages serves bytes; there is no server to keep alive, which suits a
  project whose value is archival.

### Why prerender rather than a plain SPA

GitHub Pages has no rewrite rules, so in a pure SPA `/texts/io-za-2` returns
a 404 on a cold visit. Prerendering each route to a real HTML file fixes that,
and pays for itself three more times: crawlers and link previews see content,
readers without JavaScript still get the text, and first paint does not wait
on a WebAssembly runtime plus a database download.

The prerender step runs in Node against the *same* `web.db` (via
`better-sqlite3`), so there is exactly one data source. SQLite-wasm then loads
lazily in the browser, only for the views that need the whole corpus: search,
word pages, filtered indexes.

### Why React

Most of this site is static text, and React does not earn its place there. It
earns it on four things: alignment highlighting across three layers, the
search view, filtered indexes, and the per-reading disclosures — plus a
component model for the many small repeated pieces (sign, word, reading,
confidence badge, credit line). The cost is the prerender-and-hydrate
pipeline above. Without those interactions, a plain static generator would be
the simpler answer.

### Constraints this imposes

- **No custom headers on Pages**, so no COOP/COEP, so no `SharedArrayBuffer`.
  Use the single-threaded, in-memory sqlite-wasm build. No OPFS persistence;
  cache the database bytes in Cache Storage instead.
- **Pages does not compress `application/octet-stream`.** Shipping `web.db`
  raw means 2.4 MB on the wire instead of 380 KB. Ship `web.db.gz` and inflate
  it with `DecompressionStream('gzip')`, and keep the raw file as a fallback.
- **Two toolchains**: Python for the data, Node for the site. The boundary is
  `web.db`, and it is the only thing they share.
- Pages soft limits: 1 GB per site, ~100 GB/month bandwidth. The database is
  irrelevant against that; the images are not.

## Data access

`python3 -m lineara site data` derives `web.db` from `lineara.db`: drop the
`raw` column, add the `slug` column, keep the indexes, `VACUUM`, then gzip.

Prerender and client share one shape. The props a text page receives:

```ts
type TextPage = {
  id: string; slug: string;                    // "IO Za 2", "io-za-2"
  site: string | null; type: string | null; period: string | null;
  layout: "running" | "ledger" | "compact";
  refs: { gorila?: string; museum?: string };
  images: { kind: "facsimile" | "photograph"; src: string; credit: string }[];
  lines: { n: number; tokens: Token[] }[];
  words: Word[];
  wholeTextReadings: { text: string; source: SourceRef; peerReviewed: boolean }[];
  notes: { unglossedWords: number; segmentationDisputes: Dispute[] };
};

type Token =
  | { k: "sign"; i: number; id: string; g: string; t: string; w: number; novalue?: boolean }
  | { k: "logo"; id: string; t: string }      // GRA, VIN, OLE
  | { k: "num"; v: number }
  | { k: "frac"; id: string; t: string }      // sign label, never a numeric value
  | { k: "div" }                               // word divider
  | { k: "mark"; kind: "damage" };             // U+1076B, never emitted as a character

type Word = {
  i: number; key: string;                      // "AB08 AB59 AB28 A301 AB54 AB57"
  form: string;                                // "a-ta-i-*301-wa-ja"
  signs: number[];                             // token indices, for alignment
  layer: "editorial" | "mechanical";
  attest: { texts: number; sites: number; href: string };
  readings: Reading[];                         // [] is the common case
};
```

Two additions to the Python pipeline, both small:

- **`slug`** on every inscription, generated once and stored, so URLs are stable.
- **`translations`**: the readings schema is per-word; a full-sentence
  translation belongs to the text. Add an optional array to the readings file
  format, keyed by inscription id.

### URL slugs

Ids contain spaces, `+`, `.`, `<>`, `()`, `?` and Greek letters
(`HT Wa 1019α`, `AP Za <3>`, `HT 123+124a`, `CR (?)Zf1`). Naive slugging
collides: `HT 154.` and `HT 154` both give `ht-154`. 77 ids need care.

Rule: lowercase, transliterate Greek letters (α→a), replace runs of other
characters with `-`, trim. **On collision, append a disambiguator derived from
the raw id** and record it in the database, so slugs never shift when the
corpus is rebuilt. Generated slugs are stored, not recomputed at request time.
`/texts/IO%20Za%202` and other spellings redirect to the canonical slug.

## Search

Search is a SQL query against the database already in the browser. There is
no separate index to build, ship or keep in sync: 1,101 word types and 1,884
texts are nothing for SQLite, and the matching rules are the CLI's.

The input must accept all of these, because a visitor will paste whatever
they have:

- Linear A Unicode, pasted from anywhere
- transliteration, with or without hyphens, any case (`kuro`, `KU-RO`)
- sign ids (`AB57`), inscription ids (`IO Za 2`, `iozA2`), sites, museum numbers

All of them normalise through the same sign-id key the CLI uses, so
`𐙂𐘁`, `ku-ro` and `KURO` land on one result. That normaliser is the one
piece of `signs.py` that must be reimplemented in TypeScript (about 50 lines:
glyph → sign id, transliteration token → sign id, key → display form); it is
worth porting rather than wrapping, and it needs its own tests on both sides.
When there is no match, offer near misses with the existing one-sign edit
distance, which is what surfaces the JA- / A- / zero alternation in the
formula.

## Accessibility

Linear A presents a specific problem: **screen readers cannot pronounce it.**
The code points have no phonetic identity to assistive technology, and will
be announced as unknown characters or skipped.

- Mark the glyph layer `aria-hidden="true"` and give each word group an
  `aria-label` with its transliteration, so the text is read as
  "a-ta-i-star-301-wa-ja" rather than silence.
- Tag the Linear A layer `lang="lab-Lina"` (ISO 639-3 `lab`, script `Lina`) —
  **verify both subtags** before shipping.
- Hover-to-align must have a tap and a keyboard equivalent: sign groups are
  focusable, alignment highlight follows focus.
- Tap targets ≥44px on the sign layer; the glyphs are large already, but the
  transliteration row is not.
- Respect `prefers-reduced-motion` for any highlight transition.
- The prerendered HTML must be complete text, not a loading shell: the page
  has to be readable before hydration and with JavaScript disabled entirely.
- Confidence must be legible without colour (see above), and the whole page
  must survive at 200% zoom and at 400px width, where the interlinear layout
  needs to wrap per word rather than scroll horizontally.

## Rights: this constrains the design

The data is not freely licensed, and the site must reflect that:

- SigLA-derived material is **CC BY-NC-SA 4.0**. The site therefore must be
  **non-commercial** — no ads, no paywall — and must carry attribution to
  SigLA (Salgarella & Castellan) and to the Navarre-AI dataset on every page
  or in a site-wide credit that is one click from every page.
- lineara.xyz's Unicode text carries **no licence**. Credit it and link to it.
- **The images are the sharpest constraint.** Both the photographs and the
  facsimile drawings from lineara.xyz are GORILA plate material, marked
  © École Française d'Athènes in lineara.xyz's own metadata. Holding local
  copies for development is one thing; publishing them on GitHub Pages is
  redistribution. Three routes, in order of preference: ask the EFA for
  permission; use SigLA's tracings where they cover the same object, which are
  CC BY-NC-SA and so publishable with attribution, non-commercially, with
  share-alike; or link out to the source pages and ship no images. This is why
  images are a build flag, not a template assumption.
- **Publishing the database is itself redistribution.** `web.db` embeds the
  Unicode text from lineara.xyz, which carries no licence at all — the
  upstream Navarre dataset deliberately declines to redistribute it. Before
  any public deploy: ask lineara.xyz for permission, or build `web.db` from
  the SigLA-derived fields only, which covers the 762 faces that have
  per-sign data.
- GORILA and RILA are in copyright: cite volume and page, never reproduce.

`/about` carries the full provenance chain, the licences, and a "how to cite"
block. Each text page's `[Cite]` gives the inscription's GORILA reference and
the dataset citation, not just the URL.

## Phases

1. **The text page, prerendered, on the 298 faces with 5+ signs.** Three
   layers, alignment, both genres, fonts, per-word attestation — with the
   Vite build, the `web.db` step and the Actions deploy wired up end to end.
   This carries the whole design risk and most of the stack risk.
2. **SQLite in the browser: word pages and search.** `/words/ku-ro` and the
   query layer. This is where the site becomes more useful than a PDF, and
   where React earns its keep.
3. **The long tail.** Full pages out to all 554 faces with 2+ signs; grouped
   pages for the 1,330 single-sign and blank faces; sign chart; site pages.
4. **Images**, once the rights question is settled, behind the build flag.
5. **Readings as a contribution surface.** A documented path for someone to
   propose a reading as a pull request against `readings/*.json`, since the
   schema already validates and the build already fails loudly on bad data.

## Open questions

1. **Image rights.** Blocks any public deploy that includes images. Ask the
   EFA, fall back to SigLA tracings, or link out. Local development copies are
   unaffected.
2. **The lineara.xyz licence.** Blocks publishing `web.db` as it stands, since
   the Unicode text is unlicensed. Ask, or rebuild the published database from
   SigLA-derived fields only.
3. **Is the whole-text translation section wise at all?** It is the part a
   news reader wants and the part most likely to be quoted out of context. The
   design above shows it last, attributed, with the caveat attached. An
   alternative is to omit it and show only per-word glosses.
4. **Should mechanical runs appear on text pages?** They cover the ~1,000
   faces with no editorial word division, but they are not words. Suggest:
   show them, clearly labelled "no editorial word division", with a one-line
   explanation of what that means.
5. **Dating.** The corpus has both `period` (SigLA) and `gorila_dating` in
   different vocabularies (`LM IB` vs `MR I B`), and 16 records carry
   unresolved conflicts. Either show both with sources, or normalise and
   document the mapping. Do not silently pick one.

### To verify before building

- That Noto Sans Symbols 2 covers U+10100–U+1013F (Aegean numbers), as
  lineara.xyz's bundled fonts suggest.
- The `lab` language subtag and `Lina` script subtag.
- That the damage mark and the four unassigned code points are handled
  everywhere text is emitted: the page, copy-to-clipboard, `aria-label`s, the
  prerendered HTML and every search result.
- That single-threaded sqlite-wasm runs on Pages without COOP/COEP headers,
  and that `DecompressionStream('gzip')` is available in the browsers you
  intend to support.
