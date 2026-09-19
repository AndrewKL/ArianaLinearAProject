# Design doc: a browsable Linear A corpus website

Status: draft for review. Build target deliberately left open (see
[Open questions](#open-questions)).

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
  and may need a second font (Noto Sans Symbols 2). Verify coverage before
  committing to it; if the numeral glyphs are unavailable, render numerals as
  digits, which is what the transliteration layer does anyway.
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

## Data shape

The site consumes JSON generated from `lineara.db`, so the site has no
database at runtime. One file per text page:

```json
{
  "id": "IO Za 2", "slug": "io-za-2",
  "site": "Iouktas", "type": "stone_vessel", "period": null,
  "layout": "running",
  "refs": { "gorila": "4, p. 8", "museum": "HM 3642" },
  "lines": [
    { "n": 0, "tokens": [
      { "k": "sign", "i": 0, "id": "AB08", "g": "𐘇", "t": "a",    "w": 0 },
      { "k": "sign", "i": 1, "id": "AB59", "g": "𐘳", "t": "ta",   "w": 0 },
      { "k": "sign", "i": 3, "id": "A301", "g": "𐙕", "t": "*301", "w": 0, "novalue": true },
      { "k": "div" },
      { "k": "mark", "kind": "damage" },
      { "k": "num", "v": 130 },
      { "k": "logo", "id": "AB120", "t": "GRA" }
    ] }
  ],
  "words": [
    {
      "i": 0, "key": "AB08 AB59 AB28 A301 AB54 AB57",
      "form": "a-ta-i-*301-wa-ja", "signs": [0,1,2,3,4,5],
      "layer": "editorial",
      "attest": { "texts": 11, "sites": 5, "href": "/words/a-ta-i-301-wa-ja" },
      "readings": [
        { "gloss": "opening element of the libation formula; meaning unknown",
          "confidence": "established", "source": "conventional",
          "scope": "exact", "basis": "Stands first on stone libation vessels…" }
      ]
    }
  ],
  "whole_text_readings": [
    { "text": "Father of the Bull-Contest of Dikte…", "source": "schumann-2026",
      "peer_reviewed": false }
  ],
  "notes": { "unglossed_words": 4, "segmentation_disputes": [ { "word": 6, "source": "schumann-2026" } ] }
}
```

Two fields need adding to the pipeline, both small:

- **`slug`** on every inscription, generated and stored so URLs are stable.
- **`whole_text_readings`**: the readings schema is per-word; a full-sentence
  translation belongs to the text. Add an optional `translations` array to the
  readings file format, keyed by inscription id.

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

The corpus is small enough to search entirely in the browser: 1,101 word
types, 1,884 texts. Ship a prebuilt index (expected well under 1 MB,
gzip-compressed, loaded lazily on first use).

The input must accept all of these, because a visitor will paste whatever
they have:

- Linear A Unicode, pasted from anywhere
- transliteration, with or without hyphens, any case (`kuro`, `KU-RO`)
- sign ids (`AB57`), inscription ids (`IO Za 2`, `iozA2`), sites, museum numbers

All of them normalise through the same sign-id key the CLI uses, so
`𐙂𐘁`, `ku-ro` and `KURO` land on one result. When there is no match,
offer near misses using the existing one-sign edit distance, which is what
surfaces the JA- / A- / zero alternation in the formula.

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
- **Do not publish inscription photographs or tracings.** SigLA's tracings are
  NC-SA, and the lineara.xyz photographs are © École Française d'Athènes.
  Link out to the source pages instead. This is the main reason the design
  above is typographic rather than photographic.
- GORILA and RILA are in copyright: cite volume and page, never reproduce.

`/about` carries the full provenance chain, the licences, and a "how to cite"
block. Each text page's `[Cite]` gives the inscription's GORILA reference and
the dataset citation, not just the URL.

## Phases

1. **The text page, on the 298 substantive faces.** Three layers, alignment,
   both genres, fonts, per-word attestation. This is the whole design risk.
2. **Word pages and search.** `/words/ku-ro` and the client-side index. This
   is where the site becomes more useful than a PDF.
3. **The long tail.** Grouped pages for the 1,330 single-sign and blank faces;
   sign chart; site pages.
4. **Readings as a contribution surface.** A documented path for someone to
   propose a reading as a pull request against `readings/*.json`, since the
   schema already validates and the build already fails loudly on bad data.

## Open questions

1. **Build target.** Static generator in this repo (`python3 -m lineara site
   build`), a JS framework, or something else. The data shape above is
   deliberately generator-agnostic. Recommendation: static generation, because
   the data changes only when the corpus does, and static files match the
   non-commercial, archival character of the project.
2. **Is the whole-text translation section wise at all?** It is the part a
   news reader wants and the part most likely to be quoted out of context. The
   design above shows it last, attributed, with the caveat attached. An
   alternative is to omit it and show only per-word glosses.
3. **Should mechanical runs appear on text pages?** They cover the ~1,000
   faces with no editorial word division, but they are not words. Suggest:
   show them, clearly labelled "no editorial word division", with a one-line
   explanation of what that means.
4. **Dating.** The corpus has both `period` (SigLA) and `gorila_dating` in
   different vocabularies (`LM IB` vs `MR I B`), and 16 records carry
   unresolved conflicts. Either show both with sources, or normalise and
   document the mapping. Do not silently pick one.

### To verify before building

- Noto Sans Linear A's coverage of U+10100–U+1013F (Aegean numbers), and
  whether a second font is needed.
- The `lab` language subtag and `Lina` script subtag.
- That the damage mark and the four unassigned code points are handled
  everywhere text is emitted, including copy-to-clipboard and the search index.
