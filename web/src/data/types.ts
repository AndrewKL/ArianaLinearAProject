/**
 * Shapes shared by the prerender step (Node, node:sqlite) and the browser
 * (sqlite-wasm). Both satisfy `Db`, so every query in queries.ts runs
 * unchanged on either side. See docs/website-design.md, "Data access".
 */

export interface Db {
  all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[];
}

export type TokenKind = "sign" | "logo" | "num" | "frac" | "div" | "mark";

export type Token =
  | { k: "sign"; i: number; id: string; g: string; t: string; novalue?: boolean }
  | { k: "logo"; id: string; g: string; t: string }
  | { k: "num"; v: number }
  | { k: "frac"; id: string; g: string; t: string }
  | { k: "div" }
  | { k: "mark"; kind: "damage" };

export interface Reading {
  gloss: string;
  confidence: "established" | "widely-accepted" | "debated" | "speculative";
  sourceId: string;
  sourceLabel: string;
  peerReviewed: number | null;
  scope: "exact" | "part";
  matchedForm: string;
  proposedOn: string | null;
  basis: string | null;
  note: string | null;
}

export interface Word {
  i: number;
  key: string;
  form: string;
  /** The word in Linear A characters; "" where no sign has a glyph. */
  glyphs: string;
  layer: "editorial" | "mechanical";
  attest: { texts: number; sites: number };
  readings: Reading[];
}

/**
 * Where a text was found. The corpus names a site but records no position,
 * so this comes from the curated gazetteer in data/sites.csv. `precision`
 * says what the point marks, and is shown rather than rounded away: a peak
 * sanctuary is a site, a findspot known only as "Crete" is a region.
 */
export interface Place {
  name: string;
  label: string;
  region: string | null;
  lat: number | null;
  lon: number | null;
  precision: "site" | "locality" | "region" | null;
  wikidata: string | null;
  mapUrl: string;
  wikipediaUrl: string | null;
}

export interface TextPage {
  id: string;
  slug: string;
  site: string | null;
  place: Place | null;
  type: string | null;
  period: string | null;
  refs: { gorila: string | null; museum: string | null };
  images: Image[];
  lines: { n: number; tokens: Token[] }[];
  words: Word[];
  wordLayer: "editorial" | "mechanical";
  translations: Translation[];
}

export interface Image {
  kind: "facsimile" | "photograph";
  src: string;
  width: number | null;
  height: number | null;
  credit: string;
}

export interface Translation {
  text: string;
  notes: string | null;
  sourceId: string;
  sourceLabel: string;
  sourceTitle: string;
  sourceUrl: string | null;
  sourceKind: string;
  peerReviewed: number | null;
  year: number | null;
}

export interface Featured extends Translation {
  slug: string;
  inscriptionId: string;
  site: string | null;
  type: string | null;
}

export interface Stats {
  faces: number;
  withText: number;
  words: number;
  distinctWords: number;
  readings: number;
  sources: number;
  upstreamCommit: string;
}

export interface HomeData {
  route: "home";
  stats: Stats;
  headline: Featured | null;
  featured: { slug: string; id: string; site: string | null; translit: string }[];
}

export interface TextData {
  route: "text";
  text: TextPage;
}

export type PageData = HomeData | TextData;
