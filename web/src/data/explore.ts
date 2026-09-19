/**
 * Exploring one word across the corpus, in the browser.
 *
 * Matching is on sign-id keys ("AB57 AB31 AB31 AB60 AB13"), never on spelling,
 * so a word found here is the same word however its source wrote it. This is
 * the TypeScript half of `lineara/signs.py`; the two must agree, and both are
 * tested. See docs/website-design.md, "Search".
 */

import type { Db } from "./types";

export interface Attestation {
  id: string;
  slug: string;
  site: string | null;
  type: string | null;
  key: string;
  form: string;
  /** How the match sits in that text: the word itself, or part of a longer one. */
  scope: "exact" | "inside";
}

export interface SimilarForm {
  key: string;
  form: string;
  texts: number;
  /** 1 = one sign added, dropped or changed. */
  distance: number;
}

export interface WordReport {
  key: string;
  form: string;
  exact: Attestation[];
  inside: Attestation[];
  similar: SimilarForm[];
}

/** Levenshtein distance over whole signs, abandoned once it exceeds `limit`. */
export function signEditDistance(a: string, b: string, limit = 1): number {
  const left = a.split(" ");
  const right = b.split(" ");
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i);
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    if (Math.min(...current) > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length];
}

/** Sign id -> conventional value, loaded once per session. */
let signValues: Map<string, string> | null = null;

export function loadSignValues(db: Db): Map<string, string> {
  if (!signValues) {
    signValues = new Map(
      db
        .all<{ id: string; translit: string }>("SELECT id, translit FROM signs")
        .map((row) => [row.id, row.translit])
    );
  }
  return signValues;
}

/** Key -> lowercase transliteration, the site's convention. */
export function displayKey(values: Map<string, string>, key: string): string {
  return key
    .split(" ")
    .map((sign) =>
      sign === "?" ? "[?]" : sign.startsWith("x:") ? sign.slice(2) : values.get(sign) ?? sign
    )
    .join("-");
}

const CONTAINS = "instr(' ' || a.key || ' ', ' ' || ? || ' ') > 0";

/**
 * Everywhere this sequence of signs occurs, plus the forms that are one sign
 * away from it. `here` is the text being read, which is left out of the results.
 */
export function exploreWord(db: Db, key: string, here?: string): WordReport {
  const values = loadSignValues(db);

  const rows = db.all<{
    inscription_id: string;
    slug: string;
    site: string | null;
    type: string | null;
    key: string;
    layer: string;
  }>(
    `SELECT DISTINCT a.inscription_id, i.slug, i.site, i.type, a.key, a.layer
       FROM attestations a
       JOIN inscriptions i ON i.id = a.inscription_id
      WHERE ${CONTAINS}
      ORDER BY a.inscription_id`,
    [key]
  );

  // A text can match through both layers; the editorial word wins.
  const best = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const current = best.get(row.inscription_id);
    const better =
      !current ||
      (current.key !== key && row.key === key) ||
      (current.layer === "run" && row.layer === "word" && current.key === row.key);
    if (better) best.set(row.inscription_id, row);
  }

  const attestations: Attestation[] = [...best.values()]
    .filter((row) => row.inscription_id !== here)
    .map((row) => ({
      id: row.inscription_id,
      slug: row.slug,
      site: row.site,
      type: row.type,
      key: row.key,
      form: displayKey(values, row.key),
      scope: row.key === key ? "exact" : "inside",
    }));

  const similar: SimilarForm[] = [];
  if (key.split(" ").length >= 3) {
    const candidates = db.all<{ key: string; texts: number }>(
      `SELECT key, count(DISTINCT inscription_id) texts
         FROM attestations WHERE n_signs >= 2 GROUP BY key`
    );
    for (const candidate of candidates) {
      if (candidate.key === key || (" " + candidate.key + " ").includes(" " + key + " ")) continue;
      const distance = signEditDistance(key, candidate.key, 1);
      if (distance <= 1) {
        similar.push({
          key: candidate.key,
          form: displayKey(values, candidate.key),
          texts: Number(candidate.texts),
          distance,
        });
      }
    }
    similar.sort((a, b) => b.texts - a.texts || a.form.localeCompare(b.form));
  }

  return {
    key,
    form: displayKey(values, key),
    exact: attestations.filter((a) => a.scope === "exact"),
    inside: attestations.filter((a) => a.scope === "inside"),
    similar,
  };
}
