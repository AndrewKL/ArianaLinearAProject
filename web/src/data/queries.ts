/**
 * Every query the site runs. These are the CLI's queries, unchanged: matching
 * is on sign-id keys, so pasted Unicode and typed transliteration agree.
 */

import type { Db, Reading, Stats, TextPage, Token, Word } from "./types";

/** Unassigned code points that lineara.xyz uses; never emit them as characters. */
const DAMAGE_MARK = "\u{1076B}";

export function getStats(db: Db): Stats {
  const one = (sql: string) => Number(db.all<{ n: number }>(sql)[0].n);
  return {
    faces: one("SELECT count(*) n FROM inscriptions"),
    withText: one("SELECT count(*) n FROM inscriptions WHERE unicode_text IS NOT NULL"),
    words: one("SELECT count(*) n FROM words"),
    distinctWords: one("SELECT count(DISTINCT key) n FROM words"),
    readings: one("SELECT count(*) n FROM readings"),
    sources: one("SELECT count(*) n FROM sources"),
    upstreamCommit: String(
      db.all<{ value: string }>("SELECT value FROM meta WHERE key='upstream_commit'")[0]?.value ?? ""
    ).slice(0, 12),
  };
}

interface SignRow {
  id: string;
  glyph: string | null;
  phonetic: string | null;
  translit: string;
  category: string | null;
  primary_reading: string | null;
}

/** glyph -> sign, built once per page render. Variants share glyphs; prefer the base sign. */
function signIndex(db: Db) {
  const rows = db.all<SignRow>(
    "SELECT id, glyph, phonetic, translit, category, primary_reading FROM signs WHERE glyph IS NOT NULL"
  );
  const byGlyph = new Map<string, SignRow>();
  for (const row of rows) {
    const current = byGlyph.get(row.glyph!);
    const better =
      !current ||
      (!current.phonetic && !!row.phonetic) ||
      (!!current.phonetic === !!row.phonetic && row.id.length < current.id.length);
    if (better) byGlyph.set(row.glyph!, row);
  }
  return byGlyph;
}

function tokenize(text: string, byGlyph: Map<string, SignRow>): { n: number; tokens: Token[] }[] {
  const lines: { n: number; tokens: Token[] }[] = [];
  let tokens: Token[] = [];
  let n = 0;
  let i = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (ch === "\n") {
      lines.push({ n, tokens });
      tokens = [];
      n += 1;
    } else if (ch === DAMAGE_MARK) {
      tokens.push({ k: "mark", kind: "damage" });
    } else if (cp === 0x10100 || cp === 0x10101) {
      tokens.push({ k: "div" });
    } else if (byGlyph.has(ch)) {
      const s = byGlyph.get(ch)!;
      if (s.category === "syllabogram") {
        tokens.push({ k: "sign", i: i++, id: s.id, g: ch, t: s.translit, novalue: !s.phonetic });
      } else if (s.category === "fraction") {
        tokens.push({ k: "frac", id: s.id, g: ch, t: s.primary_reading ?? s.id });
      } else {
        tokens.push({ k: "logo", id: s.id, g: ch, t: s.primary_reading ?? s.id });
      }
    } else if (cp >= 0x10107 && cp <= 0x10133) {
      tokens.push({ k: "num", v: aegeanValue(cp) });
    }
    // Anything else (stray punctuation in the source) is dropped deliberately.
  }
  lines.push({ n, tokens });
  return lines.filter((l) => l.tokens.length > 0);
}

const AEGEAN_UNITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
function aegeanValue(cp: number): number {
  if (cp >= 0x10107 && cp <= 0x1010f) return AEGEAN_UNITS[cp - 0x10107];
  if (cp >= 0x10110 && cp <= 0x10118) return (cp - 0x10110 + 1) * 10;
  if (cp >= 0x10119 && cp <= 0x10121) return (cp - 0x10119 + 1) * 100;
  if (cp >= 0x10122 && cp <= 0x1012a) return (cp - 0x10122 + 1) * 1000;
  if (cp >= 0x1012b && cp <= 0x10133) return (cp - 0x1012b + 1) * 10000;
  return 0;
}

function readingsFor(db: Db, key: string): Reading[] {
  const rows = db.all<Record<string, any>>(
    `SELECT r.id AS reading_id, r.gloss, r.confidence, r.source_id, r.proposed_on,
            r.basis, r.notes, rf.key AS matched_key, rf.form AS matched_form,
            s.author, s.year, s.kind, s.peer_reviewed
       FROM reading_forms rf
       JOIN readings r ON r.id = rf.reading_id
       JOIN sources s ON s.id = r.source_id
      WHERE instr(' ' || ? || ' ', ' ' || rf.key || ' ') > 0`,
    [key]
  );
  const order = { established: 0, "widely-accepted": 1, debated: 2, speculative: 3 } as const;
  const mapped = rows
    .map((r) => ({
      id: r.reading_id as number,
      gloss: r.gloss as string,
      confidence: r.confidence as Reading["confidence"],
      sourceId: r.source_id as string,
      sourceLabel:
        r.kind === "compilation"
          ? "conventional"
          : `${String(r.author).split(" ").pop()}${r.year ? " " + r.year : ""}`,
      peerReviewed: r.peer_reviewed as number | null,
      scope: (r.matched_key === key ? "exact" : "part") as Reading["scope"],
      matchedForm: r.matched_form as string,
      proposedOn: r.proposed_on as string | null,
      basis: r.basis as string | null,
      note: r.notes as string | null,
    }))
    .sort(
      (a, b) =>
        Number(a.scope === "part") - Number(b.scope === "part") ||
        order[a.confidence] - order[b.confidence]
    );

  // A reading can match through several of its declared variants
  // (ja-sa-sa-ra-me and sa-sa-ra-me are one claim). Keep the closest match.
  const seen = new Set<number>();
  return mapped
    .filter((r) => !seen.has(r.id) && seen.add(r.id))
    .map(({ id, ...reading }) => reading);
}

function wordsFor(db: Db, id: string): { words: Word[]; layer: "editorial" | "mechanical" } {
  let layer: "editorial" | "mechanical" = "editorial";
  let rows = db.all<{ pos: number; key: string; form: string }>(
    "SELECT pos, key, form FROM words WHERE inscription_id = ? ORDER BY pos",
    [id]
  );
  if (rows.length === 0) {
    layer = "mechanical";
    rows = db.all("SELECT pos, key, key AS form FROM runs WHERE inscription_id = ? ORDER BY pos", [id]);
  }
  const words = rows.map((row) => {
    const spread = db.all<{ texts: number; sites: number }>(
      `SELECT count(DISTINCT inscription_id) texts, count(DISTINCT site) sites
         FROM attestations WHERE instr(' ' || key || ' ', ' ' || ? || ' ') > 0`,
      [row.key]
    )[0];
    return {
      i: row.pos,
      key: row.key,
      form: displayForm(db, row.key),
      layer,
      attest: { texts: Number(spread.texts), sites: Number(spread.sites) },
      readings: readingsFor(db, row.key),
    };
  });
  return { words, layer };
}

/** Key -> lowercase transliteration, the convention used on the site. */
export function displayForm(db: Db, key: string): string {
  const parts = key.split(" ").map((sid) => {
    if (sid === "?") return "[?]";
    if (sid.startsWith("x:")) return sid.slice(2);
    const row = db.all<{ translit: string }>("SELECT translit FROM signs WHERE id = ?", [sid])[0];
    return row ? row.translit : sid;
  });
  return parts.join("-");
}

export function getTextPage(db: Db, slug: string): TextPage | null {
  const row = db.all<Record<string, any>>(
    `SELECT id, slug, site, type, period, gorila_ref, museum_inventory, unicode_text, translit_text
       FROM inscriptions WHERE slug = ?`,
    [slug]
  )[0];
  if (!row) return null;
  const { words, layer } = wordsFor(db, row.id);
  return {
    id: row.id,
    slug: row.slug,
    site: row.site,
    type: row.type,
    period: row.period,
    refs: { gorila: row.gorila_ref, museum: row.museum_inventory },
    lines: row.unicode_text ? tokenize(row.unicode_text, signIndex(db)) : [],
    words,
    wordLayer: layer,
  };
}

/** Texts with the most signs: the ones worth reading. */
export function featuredTexts(db: Db, limit = 8) {
  return db
    .all<{ slug: string; id: string; site: string | null; translit_text: string }>(
      `SELECT i.slug, i.id, i.site, i.translit_text
         FROM inscriptions i
         JOIN (SELECT inscription_id, sum(n_signs) total FROM runs GROUP BY inscription_id) r
           ON r.inscription_id = i.id
        WHERE i.translit_text IS NOT NULL AND i.type = 'stone_vessel'
        ORDER BY r.total DESC LIMIT ?`,
      [limit]
    )
    .map((r) => ({
      slug: r.slug,
      id: r.id,
      site: r.site,
      translit: r.translit_text.split("\n")[0].slice(0, 80),
    }));
}
