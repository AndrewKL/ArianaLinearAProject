# linear-a-seattle

A queryable database of the Linear A inscriptions, with a separate layer of
proposed meanings. Each meaning records who proposed it and how confident the
claim is.

Paste in a Linear A snippet, as Unicode or as transliteration, and the tool
shows:
- which signs it contains
- every other inscription where each sign sequence occurs
- every recorded interpretation of those sequences, including competing ones

```
$ python3 -m lineara decode '𐘇𐘳𐘚𐙕𐘮𐘱𐄁𐘱𐘆𐘸𐘹'
...
Sequences
  A-TA-I-*301-WA-JA          11 inscriptions, 5 sites
      [established · conventional] "opening element of the libation formula; meaning unknown"
      [speculative · Schümann 2026, preprint, not peer-reviewed] "Father of the Bull-Contest"  (proposed on IO Za 2; ...)
  JA-DI-KI-TU                only in IO Za 2
      [widely-accepted · conventional] "Dikte (place name)"
      [speculative · Schümann 2026, preprint, not peer-reviewed] "from Dikte"  (proposed on IO Za 2)
```

## Background

**Linear A** is the script of Minoan Crete, c. 1800–1450 BC. About 1,400
inscriptions survive, most of them short, and most of them clay accounting
documents from Haghia Triada. There are also stone libation vessels from peak
and cave sanctuaries, and a few metal objects.

**It is undeciphered.** Many signs have Linear B counterparts, so scholars
conventionally give them Linear B sound values (A-TA-I-*301-WA-JA and so on).
Those values are a working convention, not a confirmed reading, and the
underlying Minoan language is unknown. What is reasonably well understood:
- the numerals and fractions
- many logograms for commodities: grain (GRA), wine (VIN), olive oil (OLE)
- a handful of words whose role is clear from context. KU-RO stands before
  the sum of a list, so it almost certainly means "total".

The main obstacle to decipherment is the size of the corpus. It is too small
to test a proposed meaning statistically. A proposal can only be checked by
asking whether it makes sense *in every place the word occurs*. This project
is built to make that check easy.

**Unicode.** Linear A has its own block, U+10600–U+1077F, added in Unicode 7.0.
The code points encode sign *identities* in the GORILA numbering (AB01,
A301, ...), not sound values. Numerals and word dividers come from the Aegean
Numbers block, U+10100–U+1013F. To see the glyphs you need a font that
covers the block, such as
[Noto Sans Linear A](https://fonts.google.com/noto/specimen/Noto+Sans+Linear+A).

### What started this: IO Za 2 and Schümann (2026)

IO Za 2 (Heraklion Museum HM 3642 in GORILA) is a stone libation table from the peak
sanctuary on Mount Iouktas. Its text is the best-preserved example of the
**libation formula**, a sequence that recurs on a dozen or so vessels from
different sanctuaries:

```
𐘇𐘳𐘚𐙕𐘮𐘱𐄁𐘱𐘆𐘸𐘹𐄁𐘱𐘞𐘞𐘴𐘋𐄁𐘉𐘅𐘾𐘅𐘤𐄁𐘚𐘢𐘅𐙁𐄁
𐘤𐘘𐘃𐄁𐘳𐘅𐘴𐘃𐘉𐘠𐘯𐄁𐘚𐘀[…]

A-TA-I-*301-WA-JA · JA-DI-KI-TU · JA-SA-SA-RA-ME · U-NA-KA-NA-SI · I-PI-NA-MA ·
SI-RU-TE · TA-NA-RA-TE-U-TI-NU · I-DA[…]
```

In June 2026 Michael Schümann posted a preprint to Zenodo
([doi:10.5281/zenodo.20698076](https://doi.org/10.5281/zenodo.20698076)),
reported by [Arkeonews](https://arkeonews.net/3500-year-old-linear-a-prayer-may-reveal-minoan-roots-of-dionysos-and-demeter/).
It translates the inscription as *"Father of the Bull-Contest of Dikte, weep
the tears; may the libation offering flow in streams in the sanctuary of the
god Tinu and Ida-Mate,"* and connects TI-NU with Dionysos and I-DA-MA-TE with
Demeter.

Almost everything except the translation was established before the preprint:
- the text itself
- its segmentation
- the structure of the formula
- JA-DI-KI-TU as a probable Dikte toponym
- the Demeter comparison, which has been floated for decades

What is new is the set of meanings. They rest on the author's own
reconstruction of the Minoan language, with no independent test, and the
preprint is not peer-reviewed. Some of the claims depend on splitting
TA-NA-RA-TE-U-TI-NU into three words even though there is no divider on the
stone.

This database records those claims as they are: one source's speculative
readings, next to the conventional interpretations, and linked to every
other inscription where the same words occur. For example,
`python3 -m lineara word ja-sa-sa-ra-me` shows that "the tears" would also
have to make sense on a metal object from Platanos (PL Zf 1). That is the
kind of check a proposed meaning has to pass.

## Setup

Python 3.9+ and the standard library only.

```sh
python3 -m lineara build      # fetches the pinned upstream corpus, builds lineara.db
python3 -m unittest discover -s tests
```

## Usage

```sh
python3 -m lineara show "IO Za 2"            # one inscription: text, words, readings
python3 -m lineara show IOZa2                # ids are matched ignoring spaces/case
python3 -m lineara word ja-sa-sa-ra-me -v    # every attestation, with context, readings, basis
python3 -m lineara word '𐘱𐘞𐘞𐘴𐘋'              # same, from Unicode
python3 -m lineara word 'a-ta-i-*301-wa-ja'  # quote forms containing * in zsh/bash
python3 -m lineara decode '<paste Unicode>'  # sign-by-sign breakdown + lookup of each sequence
python3 -m lineara decode 'ku-ro ki-ro'      # transliterated words work too
echo '𐘇𐘳𐘚𐙕𐘮𐘱' | python3 -m lineara decode -
python3 -m lineara search Iouktas            # by id, site, object type or museum number
python3 -m lineara readings --source schumann-2026
python3 -m lineara stats
```

The database is plain SQLite, so you can also query it directly:

```sh
sqlite3 lineara.db "SELECT site, count(DISTINCT inscription_id) FROM attestations
                    WHERE key = 'AB57 AB31 AB31 AB60 AB13' GROUP BY site"
```

## How it is built

**Two layers.** The corpus is treated as fixed input and is never edited
here. Interpretations live in `readings/*.json`, one file per source, under
version control. The build loads both into `lineara.db`. Competing claims
about the same word are separate rows. None overwrites another.

**Words are matched by sign identity, not spelling.** The sources disagree on
spelling. For example, SigLA writes `*79` and `A301` where lineara.xyz writes
`zu` and `*301`. Every form is therefore reduced to a key of GORILA sign ids,
e.g. `AB57 AB31 AB31 AB60 AB13` for JA-SA-SA-RA-ME. Pasted Unicode reduces to
the same key, because Unicode also encodes sign ids. Transliteration is
displayed uniformly from the key.

**Two segmentations.**
- `words`: the editorial word divisions given by SigLA or lineara.xyz, 701 faces.
- `runs`: a mechanical segmentation of the Unicode text into maximal runs
  of syllabic signs, split at dividers, line ends, numerals and logograms.
  This covers the roughly 1,000 faces that have text but no editorial
  division. It can split a word that wraps a line, and it can join two
  words an editor would separate.

Lookups use editorial words first, and fall back to runs for inscriptions
that have none.

**Matching.** `word` reports:
- exact matches
- occurrences inside longer words (KU-RO inside PO-TO-KU-RO)
- *similar forms*: sequences one sign away, which catches the JA- / A- /
  zero alternation in the libation formula.

A reading applies to its form, plus any `variants` it declares explicitly.
It is also shown, labelled "on the part …", wherever its form occurs inside
a longer word. That is how Schümann's TI-NU reading surfaces on
TA-NA-RA-TE-U-TI-NU.

**The `¦` mark.** lineara.xyz marks damage or uncertainty with the unassigned
code point U+1076B, and strips it before matching words. This project does
the same: the mark is shown as `¦` in transliteration and ignored for
matching. U+1076C–U+1076F are lineara.xyz's own assignments for signs
\*809–\*811 and \*829.

### Tables

| Table | Contents |
|---|---|
| `inscriptions` | One row per inscribed face: site, type, period, findspot, scribe, GORILA ref, museum no., Unicode text, rendered transliteration, full upstream record (`raw`) |
| `words` | Editorial word divisions: `form` as written by the source, `key` |
| `runs` | Mechanical sign runs from the Unicode text |
| `sign_occurrences` | Per-position sign data from SigLA (role, reading, certainty) |
| `signs` | 402 signs: glyph, code point, conventional value, category, logogram label |
| `sources`, `readings`, `reading_forms` | Who proposed what, for which forms |
| `attestations` (view) | `words` ∪ `runs` with site, type and period |

## Adding readings

Add a file to `readings/`, then run `python3 -m lineara build`. The build
validates the file and fails loudly if something is wrong. It also notes
any form that occurs nowhere in the corpus.

```json
{
  "source": {
    "id": "younger-2024", "author": "John G. Younger", "year": 2024,
    "title": "Linear A Lexicon", "url": "...", "kind": "website", "peer_reviewed": false
  },
  "readings": [
    {
      "form": "ja-sa-sa-ra-me",
      "variants": ["a-sa-sa-ra-me"],
      "gloss": "...",
      "kind": "theonym",
      "confidence": "debated",
      "proposed_on": "IO Za 2",
      "source_form": "how the source spells it, if different",
      "basis": "the evidence offered",
      "notes": "..."
    }
  ]
}
```

`confidence` is one of:
- `established`: the claim follows from the texts themselves, such as a word's position in the formula
- `widely-accepted`
- `debated`
- `speculative`

It rates the claim, not the source. A peer-reviewed paper can still make a
speculative claim.

The two seed files:
- `readings/conventional.json`: the contextual interpretations that most
  discussions start from, such as KU-RO "total" and the libation-formula
  elements. Each has a `basis` you can check in the database. It is a
  compilation, not a citation.
- `readings/schumann-2026.json`: the ten glosses from the IO Za 2 preprint,
  as reported by Arkeonews. All are marked speculative, and the source is
  marked not peer-reviewed.

## Data sources and licences

The corpus comes from
[Navarre-AI/linear-a](https://github.com/Navarre-AI/linear-a), pinned to
commit `3a83a32`, with sha256-checked `corpus.json` and `signs.json`. That
dataset merges:
- [SigLA](https://sigla.phis.me/) (Salgarella & Castellan)
- GORILA (Godart & Olivier 1976–85)
- RILA Supplement 1 (2025)
- J. G. Younger's transcriptions
- [lineara.xyz](https://lineara.xyz)

It records the provenance of each field, and it contains no readings or
translations.

The upstream files are **fetched at build time, not committed here**, for two
reasons:
- part of the data is derived from SigLA, which is licensed CC BY-NC-SA 4.0
- the Unicode text comes from lineara.xyz, which carries no licence

If you publish anything built from `lineara.db`, it inherits those terms:
credit SigLA and the Navarre dataset, and keep SigLA-derived material
non-commercial and share-alike. See the upstream
[LICENSE](https://github.com/Navarre-AI/linear-a/blob/main/LICENSE) and
[CREDITS](https://github.com/Navarre-AI/linear-a/blob/main/CREDITS.md).

The Schümann preprint is CC BY 4.0. The glosses here are short quotations,
with attribution.

## A website for this data

`docs/website-design.md` is a design doc for a browsable website built on
`lineara.db`: every text with its Linear A, its transliteration, and the
competing proposed meanings per word. It covers page anatomy, the two
document genres, typography and font handling, the JSON data shape, URLs,
search, accessibility and the licensing constraints. The build target is
left open.

## Limitations

- **Sign assignments are only as good as the source.** Unicode encodes sign
  identities, so a doubtful sign in the source is a doubtful key here. The
  upstream `conflicts` field (shown by `show`) lists unresolved
  disagreements.
- **The conventional sound values are borrowed from Linear B**, so
  similar-form matches are matches of sign sequences, not of Minoan words.
- **Mechanical runs are not words.** Treat run-only attestations as leads,
  not evidence.
- **The seed readings are a starting point, not a literature review.**
  Before citing a gloss, check it against its source.
