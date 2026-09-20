# Data sources

What this project has downloaded, what it has only read, and what it could not
get. Checked against the repository, the build database and the live site on
2026-09-20. The counts here are as of that day; the site's own
[`/database/`](../web/src/pages/Database.tsx) page recomputes its numbers on
every build and is the one to trust if they drift.

## At a glance

| Source | What it gives us | Status | Rights |
|---|---|---|---|
| Navarre-AI/linear-a | the corpus and sign inventory | **downloaded**, pinned, hash-checked | mixed: CC BY-NC-SA and CC BY |
| lineara.xyz images | facsimile drawings and photographs | **downloaded**, pinned | © École Française d'Athènes |
| Wikidata | findspot coordinates, Wikipedia titles | **queried once**, kept as `data/sites.csv` | CC0 |
| Noto Sans Linear A | the font | **downloaded** | SIL OFL 1.1 |
| Readings files | 31 proposed meanings | **hand-encoded** from the literature | ours, citing others |
| Di Mino grammar PDF | one claim tested (`*301`) | **supplied by Andrew**, in the repo root | not recorded |
| Younger's lexicon | the standard free reference | **unreachable** | n/a |
| GORILA, RILA, SigLA site | the primary publications | **not obtainable** | copyright / CC BY-NC-SA |

## Downloaded

### The corpus: Navarre-AI/linear-a

`lineara/fetch.py` pulls two files from
`github.com/Navarre-AI/linear-a` at commit `3a83a327505b` and refuses any file
whose SHA-256 differs from the pin.

- `corpus.json` (1.5 MB): **1,884 inscription faces**. 1,707 have Unicode
  text, 762 have per-sign data, and 701 have editorial word divisions.
- `signs.json` (273 KB): **402 signs** with occurrence counts, categories, and
  Linear B-derived sound values where one exists.

Where the faces come from, by their `sources` field: 1,025 lineara.xyz only;
627 lineara.xyz and SigLA; 99 SigLA only; 46 those two plus the older corpus;
23 lineara.xyz plus the older corpus; 60 older corpus only; 4 from RILA and
the GORILA index. 772 records carry a SigLA id.

**Licence is mixed, per Navarre's own `LICENSE-NOTICE.md`.** The 772
SigLA-derived records and `signs.json` (whose counts are computed over them)
are **CC BY-NC-SA 4.0**, so the site must stay non-commercial and carry the
SigLA credit line. The rest is CC BY 4.0. The files land in the gitignored
`data/upstream/`, so they are fetched, not redistributed by the repo.

### The images: lineara.xyz

`lineara/images.py` pulls from `github.com/mwenge/lineara.xyz` at commit
`43fe7cf1abc8`, into `data/upstream/lineara-images/`.

- On disk: **3,482 files, 141 MB**. That is the whole upstream image set, not
  only what the site needs.
- Used by the site: **1,042 images for 554 faces**, copied into
  `web/public/img/` by `site data`.
- **1,172 candidate names do not exist upstream.** They are recorded in the
  committed `data/images-absent.json`, so a warm run makes no requests.
- CI caches `data/upstream/`, keyed on both pinned commits.

These are GORILA plate material, marked © École Française d'Athènes upstream.

### Findspot coordinates: Wikidata

`data/sites.csv` has **54 sites: 41 with coordinates, 34 with an English
Wikipedia article**. Each row cites the Wikidata item it came from and says
what the point marks (`site`, `locality` or `region`). 13 sites have no
coordinates, and their map links search by name instead.

The lookup was a one-off script that lived in a scratch directory and was
**not committed**. The CSV is the record. Correcting a row and rebuilding is
the way to change it, and `load_sites` warns if the CSV and the corpus
disagree.

### The font

Noto Sans Linear A 2.000, taken from the lineara.xyz repository. See
`web/public/fonts/FONTS.md`.

## Encoded by hand

The four files in `readings/` are **compiled for this repository from the
literature; none of them is a download.** Together they give 31 readings that
attach 36 forms. That covers 35 of the corpus's 1,101 distinct forms (3.2%)
and 130 of 1,740 word instances (7.5%).

| File | Basis | Fetched from |
|---|---|---|
| `conventional.json` | interpretations most discussions start from | none; see Younger below |
| `linear-b-names.json` | Linear A words spelled like names on the Knossos tablets | none |
| `ht-31-vessels.json` | the layout of tablet HT 31, checked against this database | none |
| `schumann-2026.json` | Schümann's preprint on IO Za 2 (Zenodo, CC BY 4.0) | Zenodo metadata page and an Arkeonews report; **the preprint itself was not read in full** |

## Supplied by Andrew

- **Tom Di Mino, *Ya Diktu* grammar** (`ya-diktu-grammar-tom-di-mino.pdf`, in
  the repo root). Used for one thing: testing its claim that `*301` is `na`.
  The claim fails against this corpus: `*301` alone stands on 239 faces and
  `na` on 14, `na` sits inside 129 words against 25 for `*301`, and six words
  contain both signs. Nothing from it is encoded as a reading.

## Read on the web, not stored

Used to check claims. Nothing from these is kept in the repo.

- Wikipedia's *Linear A* and *Minoan language* articles.
- The aiclambake.com decipherment article, reviewed for the user.
- A BMCR review of Davis (2014). It did not discuss Davis's conclusions, so it
  told us little.
- The Konosos lexicon page, which is only an index to a lexicon.
- Web searches on genetics, Aegean trade and the Keftiu texts.

**The one-pager (`who-were-the-minoans.md`) rests on search-result summaries
for its genetics and trade claims.** No genetics paper was read in full. The
Nature article was a redirect that was never followed. Treat those sections as
secondary until someone checks the papers.

## Tried and failed

- **Younger, *Linear A Texts in phonetic transcription*.** `people.ku.edu` has
  no DNS record. It failed on two separate checks on 2026-09-20 while `ku.edu`
  itself resolves. The Wayback Machine could not be fetched from this tool, so
  a cached copy was never tried by other means. Navarre's bibliography says
  its Younger snapshots sit in a **private** companion repository.
- **MDPI *Information* 15(2):73** (DOI `10.3390/info15020073`). The page and
  the PDF both return 403, including with a browser user-agent. We have the
  Semantic Scholar metadata only.
- **Wikimedia's API** rejected urllib's default User-Agent with a 403 that a
  broad `except OSError` swallowed, so every lookup silently returned nothing.
  It later rate-limited with 429. Both were fixed in the one-off lookup.

## Available upstream but never fetched

A shallow clone of Navarre's repo was read once, but only the two files above
are pinned.

- Nine GORILA index tables (`gorila_*.json`, `signs_to_gorila_index.json`).
  Navarre marks these an **open decision** on whether they stay public.
- `rila_2025_concordances.json`, `sign_301_cross_check.json`,
  `word_dedup_audit.json`, `corpus_audit_matrix.json`, `gorila_page_map.json`.
- `BIBLIOGRAPHY.md` (35 KB), the best map of what else exists, with its
  held/missing status per work.
- In the lineara.xyz repo: `commentary/` (42 pages) and `network/`.

## Not obtainable

- **GORILA and RILA.** In copyright; cited by Navarre, never included.
- **SigLA's own site** (`sigla.phis.me`). Only the data derived from it, via
  Navarre.
- **Davis, *Minoan Stone Vessels with Linear A Inscriptions*** (2014), beyond
  search summaries.

## Rights and publication: needs a decision

Two facts sit awkwardly against each other.

**What is live.** Checked on 2026-09-20 at
`https://www.andrewklong.com/ArianaLinearAProject/`:

- `/img/io-za-2-facsimile.jpg` returns 200, 273,394 bytes.
- `/data/web.db.gz` returns 200, 355,623 bytes.
- `/about/` and `/database/` return 404, because they are not pushed yet.

**What the docs say.** `docs/website-design.md` lists image rights and the
lineara.xyz licence as open questions that block a public deploy: the images
are © EFA, and `web.db` embeds lineara.xyz's Unicode text, which carries no
licence. `web/README.md` says the same and describes the gate: CI downloads
images only when the repository variable `INCLUDE_IMAGES` is set, and deploys
only when `PUBLISH_ALLOWED` is set as well.

Those variables are now set, so the deploy was switched on deliberately. What
the repository does not record is whether the two permissions were ever
obtained. Both open questions still read as open. Whichever is true, the
design doc should be updated to say so.

**The Di Mino PDF** (`ya-diktu-grammar-tom-di-mino.pdf`, 446 KB) is a
third-party document with no licence recorded. It is tracked in git in the
unpushed commit `a289412`, and is not on `origin/main`. A push would publish
it. It is not gitignored.
