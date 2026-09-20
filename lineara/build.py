"""Build lineara.db from the pinned upstream corpus plus the readings/*.json files."""

import csv
import json
import sqlite3
from pathlib import Path

from . import fetch as upstream
from .signs import SignTable, key_len

ROOT = upstream.ROOT
DB_PATH = ROOT / "lineara.db"
READINGS_DIR = ROOT / "readings"
SITES_CSV = ROOT / "data" / "sites.csv"

CONFIDENCE = ("established", "widely-accepted", "debated", "speculative")
# What a site's point marks: the excavated site, the settlement it lies in, or
# only the island or region. Shown to the reader, never silently rounded off.
PRECISION = ("site", "locality", "region")

SCHEMA = """
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE signs (
    id TEXT PRIMARY KEY,          -- GORILA siglum: AB08, A301, AB120 ...
    glyph TEXT,                   -- Unicode character, when one exists
    codepoint TEXT,
    phonetic TEXT,                -- Linear B-derived sound value, where one is conventional
    translit TEXT,                -- phonetic, else *NNN
    category TEXT,                -- syllabogram, logogram, fraction, ligature ...
    primary_reading TEXT,         -- logogram label, e.g. AB120/GRA
    linear_b TEXT,
    occurrences INTEGER,
    documents INTEGER,
    confidence TEXT
);

-- One row per inscribed face, as in the upstream corpus.
CREATE TABLE inscriptions (
    id TEXT PRIMARY KEY,          -- 'IO Za 2', 'HT 115a'
    site TEXT, type TEXT, period TEXT, findspot TEXT, scribe TEXT,
    parent_object TEXT,
    gorila_ref TEXT, gorila_dating TEXT, museum_inventory TEXT,
    unicode_text TEXT,
    translit_text TEXT,           -- rendered from unicode_text by this project
    word_source TEXT,             -- who segmented `words`: sigla | lineara
    sources TEXT,                 -- JSON list of upstream sources
    conflicts TEXT,               -- JSON: unresolved rival values upstream
    raw TEXT                      -- the full upstream record, JSON
);

-- Where the objects were found. The corpus names a site but gives no
-- position, so these coordinates are curated here: see data/sites.csv.
CREATE TABLE sites (
    name TEXT PRIMARY KEY,        -- exactly as inscriptions.site
    label TEXT,                   -- display name, the usual English one
    region TEXT,                  -- Crete, Cyclades, Peloponnese ...
    lat REAL, lon REAL,           -- null where no position is recorded
    precision TEXT,               -- site | locality | region
    wikidata TEXT,                -- the Q-id the position was taken from
    wikipedia TEXT,               -- English Wikipedia article title, where there is one
    note TEXT
);

-- Editorial word divisions, as the upstream source gives them.
CREATE TABLE words (
    inscription_id TEXT REFERENCES inscriptions(id),
    pos INTEGER,
    form TEXT,                    -- as written by the source
    key TEXT,                     -- sign-id key (see signs.py)
    n_signs INTEGER,
    PRIMARY KEY (inscription_id, pos)
);
CREATE INDEX words_key ON words(key);

-- Mechanical segmentation of unicode_text: maximal runs of syllabic signs.
-- Covers the ~1,000 records that have Unicode text but no editorial words.
CREATE TABLE runs (
    inscription_id TEXT REFERENCES inscriptions(id),
    pos INTEGER,
    line INTEGER,
    key TEXT,
    n_signs INTEGER,
    PRIMARY KEY (inscription_id, pos)
);
CREATE INDEX runs_key ON runs(key);

-- Per-position sign data from SigLA.
CREATE TABLE sign_occurrences (
    inscription_id TEXT REFERENCES inscriptions(id),
    n INTEGER,
    sign_id TEXT,
    role TEXT,
    reading TEXT,
    certain INTEGER,
    PRIMARY KEY (inscription_id, n)
);
CREATE INDEX sign_occ_sign ON sign_occurrences(sign_id);

-- Who proposed a reading.
CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    author TEXT, year INTEGER, date TEXT, title TEXT, url TEXT,
    kind TEXT,                    -- preprint, article, book, compilation ...
    peer_reviewed INTEGER,        -- 1, 0, or NULL when not applicable
    reported_by TEXT,
    notes TEXT,
    file TEXT
);

-- Proposed meanings. Competing claims are separate rows; nothing is overwritten.
CREATE TABLE readings (
    id INTEGER PRIMARY KEY,
    source_id TEXT REFERENCES sources(id),
    form TEXT,                    -- normalised display form of the target
    key TEXT,
    source_form TEXT,             -- how the source itself writes it, if different
    gloss TEXT,
    kind TEXT,                    -- lexical, theonym, toponym, accounting, formula ...
    confidence TEXT CHECK (confidence IN ('established','widely-accepted','debated','speculative')),
    proposed_on TEXT,             -- inscription the claim was made about, if any
    basis TEXT,                   -- the evidence offered
    notes TEXT
);

-- A proposed rendering of a whole text, as opposed to a per-word gloss.
-- Kept apart because the claim is of a different kind: it depends on the
-- source's own segmentation and on any restorations it makes.
CREATE TABLE translations (
    id INTEGER PRIMARY KEY,
    source_id TEXT REFERENCES sources(id),
    inscription_id TEXT REFERENCES inscriptions(id),
    text TEXT,
    notes TEXT
);
CREATE INDEX translations_inscription ON translations(inscription_id);

-- Every form a reading applies to: its own plus any declared variants.
CREATE TABLE reading_forms (
    reading_id INTEGER REFERENCES readings(id),
    key TEXT,
    form TEXT,
    PRIMARY KEY (reading_id, key)
);
CREATE INDEX reading_forms_key ON reading_forms(key);

-- Editorial words and mechanical runs in one place, with site/type for context.
CREATE VIEW attestations AS
    SELECT 'word' AS layer, w.inscription_id, w.pos, w.key, w.n_signs,
           i.site, i.type, i.period
    FROM words w JOIN inscriptions i ON i.id = w.inscription_id
    UNION ALL
    SELECT 'run', r.inscription_id, r.pos, r.key, r.n_signs, i.site, i.type, i.period
    FROM runs r JOIN inscriptions i ON i.id = r.inscription_id;
"""


class ReadingsError(Exception):
    pass


def load_corpus(conn, corpus, signs):
    for sid, e in sorted(signs.entries.items()):
        glyph = e.get("unicode")
        conn.execute(
            "INSERT INTO signs VALUES (?,?,?,?,?,?,?,?,?,?,?)",
            (sid, glyph, e.get("unicode_codepoint") or ("U+%04X" % ord(glyph) if glyph else None),
             e.get("phonetic"), signs.translit(sid), e.get("category"), e.get("primary_reading"),
             e.get("linear_b"), e.get("occurrences"), e.get("documents"), e.get("confidence")))

    for iid, r in sorted(corpus.items()):
        text = r.get("unicode_text") or ""
        conn.execute(
            "INSERT INTO inscriptions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (iid, r.get("site") or None, r.get("type") or None, r.get("period") or None,
             r.get("findspot"), r.get("scribe"), r.get("parent_object"),
             r.get("gorila_ref"), r.get("gorila_dating"), r.get("museum_inventory"),
             text or None, signs.render(text) if text else None, r.get("word_source"),
             json.dumps(r.get("sources", [])), json.dumps(r["conflicts"], ensure_ascii=False)
             if r.get("conflicts") else None, json.dumps(r, ensure_ascii=False)))

        for pos, form in enumerate(r.get("words") or []):
            key = signs.key_from_form(form)
            conn.execute("INSERT INTO words VALUES (?,?,?,?,?)", (iid, pos, form, key, key_len(key)))

        for pos, (line, toks) in enumerate(signs.runs(text)):
            key = signs.key_from_tokens(toks)
            conn.execute("INSERT INTO runs VALUES (?,?,?,?,?)", (iid, pos, line, key, len(toks)))

        for s in r.get("signs") or []:
            conn.execute("INSERT INTO sign_occurrences VALUES (?,?,?,?,?,?)",
                         (iid, s.get("n"), s.get("type"), s.get("role"), s.get("reading"),
                          None if s.get("certain") is None else int(bool(s["certain"]))))


def load_sites(conn, path=SITES_CSV, warn=print):
    """Load the curated findspot gazetteer.

    The upstream corpus names a site ('Iouktas') and sometimes a findspot
    within it ('Portico 11 and Room 13'), but never a position. data/sites.csv
    supplies one per site name, each cited to the Wikidata item it came from,
    with `precision` saying what the point actually marks. Rows with no
    coordinates are still loaded: the site keeps its display name and region,
    and the website falls back to a search by name.
    """
    if not Path(path).exists():
        warn("no gazetteer at %s; sites will have no coordinates" % path)
        return 0
    used = {row[0] for row in conn.execute(
        "SELECT DISTINCT site FROM inscriptions WHERE site IS NOT NULL")}
    seen, n = set(), 0
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            name = (row.get("site") or "").strip()
            if not name or name.startswith("#"):
                continue
            if name in seen:
                raise SystemExit("%s: duplicate site %r" % (path, name))
            seen.add(name)
            if name not in used:
                warn("%s: %r is not a site in the corpus" % (path, name))
            lat, lon = (row.get("lat") or "").strip(), (row.get("lon") or "").strip()
            precision = (row.get("precision") or "").strip() or None
            if (lat == "") != (lon == ""):
                raise SystemExit("%s: %r has only one of lat/lon" % (path, name))
            if lat and precision not in PRECISION:
                raise SystemExit("%s: %r has precision %r, expected one of %s"
                                 % (path, name, precision, ", ".join(PRECISION)))
            conn.execute("INSERT INTO sites VALUES (?,?,?,?,?,?,?,?,?)", (
                name, (row.get("label") or "").strip() or name,
                (row.get("region") or "").strip() or None,
                float(lat) if lat else None, float(lon) if lon else None,
                precision if lat else None,
                (row.get("wikidata") or "").strip() or None,
                (row.get("wikipedia") or "").strip() or None,
                (row.get("note") or "").strip() or None))
            n += 1
    missing = sorted(used - seen)
    if missing:
        warn("%s: no entry for %d corpus site(s): %s" % (path, len(missing), ", ".join(missing)))
    return n


def load_readings(conn, signs, readings_dir=READINGS_DIR, warn=print):
    known_ids = {row[0] for row in conn.execute("SELECT id FROM inscriptions")}
    attested = {row[0] for row in conn.execute("SELECT DISTINCT key FROM attestations")}
    n = 0
    for path in sorted(Path(readings_dir).glob("*.json")):
        with open(path, encoding="utf-8") as f:
            doc = json.load(f)
        src = doc.get("source") or {}
        where = path.name
        for field in ("id", "author", "title", "kind"):
            if not src.get(field):
                raise ReadingsError("%s: source.%s is required" % (where, field))
        pr = src.get("peer_reviewed")
        conn.execute("INSERT INTO sources VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                     (src["id"], src["author"], src.get("year"), src.get("date"), src["title"],
                      src.get("url"), src["kind"], None if pr is None else int(bool(pr)),
                      src.get("reported_by"), src.get("notes"), path.name))

        for i, tr in enumerate(doc.get("translations") or []):
            loc = "%s translations[%d]" % (where, i)
            for field in ("inscription", "text"):
                if not tr.get(field):
                    raise ReadingsError("%s: %s is required" % (loc, field))
            if tr["inscription"] not in known_ids:
                raise ReadingsError("%s: inscription %r is not in the corpus" % (loc, tr["inscription"]))
            conn.execute(
                "INSERT INTO translations (source_id, inscription_id, text, notes) VALUES (?,?,?,?)",
                (src["id"], tr["inscription"], tr["text"], tr.get("notes")))

        for i, rd in enumerate(doc.get("readings") or []):
            loc = "%s readings[%d]" % (where, i)
            for field in ("form", "gloss", "kind", "confidence"):
                if not rd.get(field):
                    raise ReadingsError("%s: %s is required" % (loc, field))
            if rd["confidence"] not in CONFIDENCE:
                raise ReadingsError("%s: confidence must be one of %s" % (loc, ", ".join(CONFIDENCE)))
            if rd.get("proposed_on") and rd["proposed_on"] not in known_ids:
                raise ReadingsError("%s: proposed_on %r is not an inscription id" % (loc, rd["proposed_on"]))

            key = signs.key_from_form(rd["form"])
            if "x:" in key or "?" in key.split(" "):
                raise ReadingsError("%s: %r has tokens that are not signs (%s)" % (loc, rd["form"], key))
            cur = conn.execute(
                "INSERT INTO readings (source_id, form, key, source_form, gloss, kind, confidence,"
                " proposed_on, basis, notes) VALUES (?,?,?,?,?,?,?,?,?,?)",
                (src["id"], signs.display(key), key, rd.get("source_form"), rd["gloss"], rd["kind"],
                 rd["confidence"], rd.get("proposed_on"), rd.get("basis"), rd.get("notes")))
            rid = cur.lastrowid
            for form in [rd["form"]] + list(rd.get("variants") or []):
                vkey = signs.key_from_form(form)
                conn.execute("INSERT OR IGNORE INTO reading_forms VALUES (?,?,?)",
                             (rid, vkey, signs.display(vkey)))
                if not any(vkey == a or (" %s " % vkey) in (" %s " % a) for a in attested):
                    warn("note: %s: %s is not attested in the corpus" % (loc, signs.display(vkey)))
            n += 1
    return n


def build(db_path=DB_PATH, log=print):
    data_dir = upstream.fetch(log=log)
    signs = SignTable.load(data_dir / "signs.json")
    with open(data_dir / "corpus.json", encoding="utf-8") as f:
        corpus = json.load(f)

    tmp = Path(str(db_path) + ".tmp")
    if tmp.exists():
        tmp.unlink()
    conn = sqlite3.connect(str(tmp))
    try:
        conn.executescript(SCHEMA)
        conn.executemany("INSERT INTO meta VALUES (?,?)", [
            ("upstream", "https://github.com/%s" % upstream.REPO),
            ("upstream_commit", upstream.COMMIT),
        ])
        load_corpus(conn, corpus, signs)
        load_sites(conn, warn=log)
        n = load_readings(conn, signs, warn=log)
        conn.commit()
    finally:
        conn.close()
    tmp.replace(db_path)

    conn = sqlite3.connect(str(db_path))
    counts = {t: conn.execute("SELECT count(*) FROM %s" % t).fetchone()[0]
              for t in ("inscriptions", "words", "runs", "sign_occurrences", "signs", "sources",
                        "translations")}
    conn.close()
    log("built %s: %s, %d readings" % (
        Path(db_path).name, ", ".join("%d %s" % (v, k) for k, v in counts.items()), n))
    return db_path
