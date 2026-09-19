"""Build `web.db`: the browser-facing subset of lineara.db, with URL slugs.

The website ships this file and queries it in the browser (SQLite compiled to
WebAssembly), and the prerender step reads the same file in Node. Differences
from lineara.db:

- the `raw` column is dropped: it holds the full upstream record per face and
  is most of the file size
- every inscription gets a `slug`, the URL it lives at
- the result is VACUUMed and gzipped, because GitHub Pages does not compress
  application/octet-stream

See docs/website-design.md.
"""

import gzip
import hashlib
import re
import shutil
import sqlite3
from pathlib import Path

from . import build as builder

ROOT = builder.ROOT
WEB_DIR = ROOT / "web" / "public" / "data"
WEB_DB = WEB_DIR / "web.db"

# The only non-ASCII characters in the corpus ids.
GREEK = {"α": "a", "β": "b", "γ": "g"}


def slugify(text):
    for greek, latin in GREEK.items():
        text = text.replace(greek, latin)
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def slugs_for(ids):
    """Map each id to a URL slug, deterministically.

    Naive slugging collides ('HT 154.' and 'HT 154' both give 'ht-154'), so
    when two or more ids share a base, *every* one of them takes a suffix
    derived from its own id. The result depends only on the set of ids, not on
    the order they arrive in, so slugs do not move when the corpus is rebuilt.
    """
    bases = {}
    for iid in ids:
        bases.setdefault(slugify(iid), []).append(iid)
    out = {}
    for base, members in bases.items():
        for iid in members:
            if len(members) == 1:
                out[iid] = base
            else:
                digest = hashlib.sha1(iid.encode("utf-8")).hexdigest()[:4]
                out[iid] = "%s-%s" % (base, digest) if base else digest
    return out


def _web_schema():
    """builder.SCHEMA with `raw` swapped for `slug`."""
    schema = builder.SCHEMA
    raw_col = "    raw TEXT                      -- the full upstream record, JSON\n"
    slug_col = "    slug TEXT NOT NULL            -- URL segment, see slugs_for()\n"
    assert raw_col in schema, "inscriptions.raw column not found in build.SCHEMA"
    return schema.replace(raw_col, slug_col) + "\nCREATE UNIQUE INDEX inscriptions_slug ON inscriptions(slug);\n"


TABLES = ["meta", "signs", "words", "runs", "sign_occurrences",
          "sources", "readings", "reading_forms", "translations"]


def export(db_path=builder.DB_PATH, out=WEB_DB, log=print):
    if not Path(db_path).exists():
        raise SystemExit("No database at %s. Run: python3 -m lineara build" % db_path)
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = out.with_suffix(".tmp")
    for path in (tmp, Path(str(tmp) + "-journal")):
        if path.exists():
            path.unlink()

    conn = sqlite3.connect(str(tmp))
    try:
        conn.executescript(_web_schema())
        conn.execute("ATTACH DATABASE ? AS src", (str(db_path),))

        ids = [r[0] for r in conn.execute("SELECT id FROM src.inscriptions ORDER BY id")]
        slugs = slugs_for(ids)
        cols = [r[1] for r in conn.execute("PRAGMA src.table_info(inscriptions)") if r[1] != "raw"]
        id_at = cols.index("id")
        rows = conn.execute("SELECT %s FROM src.inscriptions ORDER BY id" % ", ".join(cols))
        conn.executemany(
            "INSERT INTO inscriptions (%s, slug) VALUES (%s, ?)" % (
                ", ".join(cols), ", ".join("?" * len(cols))),
            [list(r) + [slugs[r[id_at]]] for r in rows])

        for table in TABLES:
            cols = [r[1] for r in conn.execute("PRAGMA table_info(%s)" % table)]
            conn.execute("INSERT INTO %s (%s) SELECT %s FROM src.%s" % (
                table, ", ".join(cols), ", ".join(cols), table))

        conn.commit()
        conn.execute("DETACH DATABASE src")
        conn.execute("VACUUM")
    finally:
        conn.close()

    tmp.replace(out)
    with open(out, "rb") as f, gzip.open(str(out) + ".gz", "wb", compresslevel=9) as gz:
        shutil.copyfileobj(f, gz)

    size, gz_size = out.stat().st_size, Path(str(out) + ".gz").stat().st_size
    log("wrote %s (%.1f MB, %.0f KB gzipped) with %d slugs" % (
        out.relative_to(ROOT), size / 1e6, gz_size / 1024, len(slugs)))
    return out
