"""Download the inscription images from lineara.xyz, at a pinned commit.

Two per face where they exist: the GORILA facsimile drawing and a photograph.
Only the faces that get a full page are fetched, which is about 1,000 files
and 80 MB rather than the 141 MB the source holds.

RIGHTS. These are GORILA plate material, recorded upstream as
"© École Française d'Athènes". Downloading them for local work is one thing;
**publishing them is redistribution and needs the EFA's permission**. Nothing
here publishes anything: the files land in data/upstream/, which is
gitignored, and the site renders them only where they are present. See
docs/website-design.md, "Rights: this constrains the design".
"""

import json
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import build as builder
from .site import IMAGE_SOURCE

REPO = "mwenge/lineara.xyz"
COMMIT = "43fe7cf1abc8e6bb1ea3228c3a1bd5938709620a"
STAMP = "SOURCE.txt"
KINDS = {"facsimile": "Facsimile", "photograph": "Inscription"}


def _url(name):
    return "https://raw.githubusercontent.com/%s/%s/images/%s" % (
        REPO, COMMIT, urllib.parse.quote(name))


def candidate_names(lineara_id):
    """The file names this face might have, drawing before photograph."""
    return [
        "%s-%s%s" % (lineara_id, stem, suffix)
        for stem in KINDS.values()
        for suffix in (".jpg", ".png")
    ]


def wanted(db_path=builder.DB_PATH, min_signs=2):
    """The lineara.xyz ids of the faces that get a full page."""
    conn = sqlite3.connect(str(db_path))
    try:
        rows = conn.execute(
            """SELECT id, raw FROM inscriptions
                WHERE (SELECT coalesce(sum(n_signs), 0) FROM runs
                        WHERE inscription_id = inscriptions.id) >= ?""", (min_signs,)).fetchall()
    finally:
        conn.close()
    ids = []
    for iid, raw in rows:
        lineara_id = (json.loads(raw).get("lineara_id") if raw else None) or iid.replace(" ", "")
        ids.append(lineara_id)
    return sorted(set(ids))


def _download(name, dest, force):
    path = dest / name
    if path.exists() and not force:
        return "have"
    try:
        with urllib.request.urlopen(_url(name), timeout=60) as response:
            data = response.read()
    except urllib.error.HTTPError as error:
        # Most faces have only some of the four candidate names.
        return "missing" if error.code == 404 else "error"
    except OSError:
        return "error"
    if not data:
        return "error"
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(path)
    return "new"


def fetch(db_path=builder.DB_PATH, dest=IMAGE_SOURCE, force=False, workers=8, log=print):
    dest = Path(dest)
    dest.mkdir(parents=True, exist_ok=True)
    names = [name for lineara_id in wanted(db_path) for name in candidate_names(lineara_id)]
    log("checking %d candidate files from %s@%s" % (len(names), REPO, COMMIT[:12]))

    counts = {"new": 0, "have": 0, "missing": 0, "error": 0}
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for outcome in pool.map(lambda n: _download(n, dest, force), names):
            counts[outcome] += 1

    (dest / STAMP).write_text(
        "Linear A inscription images\n"
        "===========================\n"
        "Source:  https://github.com/%s at %s\n"
        "Fetched: python3 -m lineara images fetch\n\n"
        "RIGHTS: recorded upstream as \"(c) Ecole Francaise d'Athenes\", from the\n"
        "GORILA volumes. Held here for local work. Publishing them is\n"
        "redistribution and needs the EFA's permission. This directory is under\n"
        "data/upstream/, which is gitignored.\n" % (REPO, COMMIT), encoding="utf-8")

    log("images: %d downloaded, %d already present, %d not published upstream%s"
        % (counts["new"], counts["have"], counts["missing"],
           ", %d failed" % counts["error"] if counts["error"] else ""))
    if counts["error"]:
        raise SystemExit("%d downloads failed; re-run to retry" % counts["error"])
    return counts
