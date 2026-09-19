"""Command-line interface: python3 -m lineara <command> ..."""

import argparse
import json
import re
import sqlite3
import sys
from collections import Counter

from . import build as builder
from . import fetch as upstream
from .signs import SignTable, contains, has_script_chars, key_len, sign_edit_distance

CONF_ORDER = {c: i for i, c in enumerate(builder.CONFIDENCE)}


# --- helpers -----------------------------------------------------------------

def connect(path):
    if not path.exists():
        sys.exit("No database at %s. Run: python3 -m lineara build" % path)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    return conn


def norm_id(s):
    return re.sub(r"\s+", "", s).lower()


def find_inscriptions(conn, ident):
    """Exact id, then whitespace/case-insensitive id, then all faces of an object."""
    rows = conn.execute("SELECT * FROM inscriptions WHERE id = ?", (ident,)).fetchall()
    if rows:
        return rows
    target = norm_id(ident)
    everything = conn.execute("SELECT * FROM inscriptions ORDER BY id").fetchall()
    rows = [r for r in everything if norm_id(r["id"]) == target]
    if rows:
        return rows
    return [r for r in everything if r["parent_object"] and norm_id(r["parent_object"]) == target]


def source_label(row):
    who = row["author"].split()[-1] if row["source_kind"] != "compilation" else "conventional"
    year = " %s" % row["year"] if row["year"] else ""
    status = ""
    if row["peer_reviewed"] == 0:
        status = ", %s, not peer-reviewed" % row["source_kind"]
    return "%s%s%s" % (who, year, status)


def readings_for(conn, key):
    """Readings whose form (or a declared variant) is `key` exactly, or a sub-sequence of it."""
    rows = conn.execute(
        """SELECT r.*, rf.key AS matched_key, s.author, s.year, s.kind AS source_kind, s.peer_reviewed
           FROM reading_forms rf JOIN readings r ON r.id = rf.reading_id
           JOIN sources s ON s.id = r.source_id
           WHERE instr(' ' || ? || ' ', ' ' || rf.key || ' ') > 0""", (key,)).fetchall()
    seen, out = set(), []
    for r in sorted(rows, key=lambda r: (r["matched_key"] != key, CONF_ORDER[r["confidence"]])):
        if r["id"] in seen:
            continue
        seen.add(r["id"])
        out.append((r, "exact" if r["matched_key"] == key else "part"))
    return out


def fmt_reading(signs, r, how, indent="  "):
    tag = "[%s · %s]" % (r["confidence"], source_label(r))
    head = "%s%s \"%s\"" % (indent, tag, r["gloss"])
    extra = []
    if how == "part":
        extra.append("on the part %s" % signs.display(r["matched_key"]))
    elif r["matched_key"] != r["key"]:
        extra.append("given for variant %s" % r["form"])
    if r["proposed_on"]:
        extra.append("proposed on %s" % r["proposed_on"])
    if r["source_form"]:
        extra.append("source writes %s" % r["source_form"])
    if extra:
        head += "  (" + "; ".join(extra) + ")"
    return head


def attestations(conn, key):
    """Where `key` occurs. Editorial words first; mechanical runs only for inscriptions
    the editorial layer does not already cover."""
    q = """SELECT a.*, i.word_source FROM attestations a JOIN inscriptions i ON i.id = a.inscription_id
           WHERE instr(' ' || a.key || ' ', ' ' || ? || ' ') > 0
           ORDER BY a.inscription_id, a.pos"""
    rows = conn.execute(q, (key,)).fetchall()
    word_hits = [r for r in rows if r["layer"] == "word"]
    covered = {r["inscription_id"] for r in word_hits}
    run_hits, seen = [], set()
    for r in rows:
        if r["layer"] == "run" and r["inscription_id"] not in covered and r["inscription_id"] not in seen:
            seen.add(r["inscription_id"])
            run_hits.append(r)
    return word_hits, run_hits


def word_context(conn, signs, iid, pos, width=6):
    words = conn.execute("SELECT pos, key FROM words WHERE inscription_id = ? ORDER BY pos", (iid,)).fetchall()
    lo = max(0, pos - width // 2)
    parts = []
    for w in words[lo:lo + width]:
        d = signs.display(w["key"])
        parts.append("[%s]" % d if w["pos"] == pos else d)
    return ("… " if lo > 0 else "") + " ".join(parts) + (" …" if lo + width < len(words) else "")


def similar_forms(conn, key, limit=1):
    if key_len(key) < 3:
        return []
    counts = Counter()
    for r in conn.execute("SELECT key, inscription_id FROM attestations WHERE n_signs >= 2"):
        counts[(r["key"], r["inscription_id"])] += 1
    per_key = Counter(k for k, _ in counts)
    out = []
    for k, n in per_key.items():
        if k == key or contains(k, key):
            continue
        d = sign_edit_distance(key, k, limit)
        if d <= limit:
            out.append((d, -n, k))
    return [(k, -n) for d, n, k in sorted(out)]


def summarise(conn, key):
    """(inscription ids, Counter of sites) for every attestation of `key`."""
    words, runs = attestations(conn, key)
    site_of = {r["inscription_id"]: r["site"] or "?" for r in words + runs}
    return set(site_of), Counter(site_of.values())


def spread(conn, key, here=None):
    """One-line summary of where `key` occurs, separating exact matches from longer words."""
    words, runs = attestations(conn, key)
    ids = {r["inscription_id"] for r in words + runs}
    if not ids:
        return "not attested"
    if ids == {here}:
        return "only here"
    exact = {r["inscription_id"] for r in words + runs if r["key"] == key}
    if len(ids) == 1:
        (only,) = ids
        return "only in %s" % only + ("" if exact else " (inside a longer word)")
    sites = {r["site"] for r in words + runs}
    line = "%d inscriptions, %d site%s" % (len(ids), len(sites), "" if len(sites) == 1 else "s")
    if exact != ids:
        line += " (%d as this exact sequence)" % len(exact)
    return line


# --- commands ----------------------------------------------------------------

def cmd_fetch(args):
    print(upstream.fetch(force=args.force))


def cmd_site(args):
    from . import site
    site.export(args.db)


def cmd_build(args):
    try:
        builder.build(args.db)
    except builder.ReadingsError as e:
        sys.exit("readings error: %s" % e)


def cmd_show(args):
    conn = connect(args.db)
    signs = SignTable.from_db(conn)
    rows = find_inscriptions(conn, args.id)
    if not rows:
        sys.exit("No inscription %r. Try: python3 -m lineara search %s" % (args.id, args.id))
    for n, ins in enumerate(rows):
        if n:
            print()
        meta = [x for x in (ins["site"], ins["type"], ins["period"]) if x]
        print("%s  —  %s" % (ins["id"], ", ".join(meta)))
        refs = []
        if ins["gorila_ref"]:
            refs.append("GORILA %s" % ins["gorila_ref"])
        if ins["museum_inventory"]:
            refs.append(ins["museum_inventory"])
        if ins["scribe"]:
            refs.append(ins["scribe"])
        if ins["parent_object"]:
            refs.append("face of %s" % ins["parent_object"])
        if refs:
            print("  " + " · ".join(refs))

        if ins["unicode_text"]:
            print("\nUnicode\n" + "\n".join("  " + l for l in ins["unicode_text"].split("\n")))
            print("\nTransliteration (rendered from the Unicode; ¦ = damage mark)")
            print("\n".join("  " + l for l in ins["translit_text"].split("\n")))
        else:
            print("\n  (no Unicode text in the corpus for this face)")

        words = conn.execute("SELECT * FROM words WHERE inscription_id = ? ORDER BY pos", (ins["id"],)).fetchall()
        layer = "Words (editorial division, from %s)" % ins["word_source"]
        if not words:
            words = conn.execute("SELECT * FROM runs WHERE inscription_id = ? ORDER BY pos", (ins["id"],)).fetchall()
            layer = "Sign runs (mechanical: no editorial word division for this face)"
        if words:
            print("\n" + layer)
            for w in words:
                print("  %-26s %-12s %s" % (signs.display(w["key"]), signs.glyphs(w["key"]),
                                            spread(conn, w["key"], here=ins["id"])))
                for r, how in readings_for(conn, w["key"]):
                    print(fmt_reading(signs, r, how, indent="      "))

        if ins["conflicts"]:
            print("\nUnresolved upstream conflicts")
            for c in json.loads(ins["conflicts"]):
                print("  %s: %r (%s) vs %r (%s)" % (c.get("field"), c.get("ours"), c.get("our_source"),
                                                    c.get("theirs"), c.get("their_source")))
                if c.get("note"):
                    print("    " + c["note"])


def cmd_word(args):
    conn = connect(args.db)
    signs = SignTable.from_db(conn)
    key = signs.key_from_text(args.form)
    if not key:
        sys.exit("No signs recognised in %r" % args.form)
    print("%s  %s   (%s)" % (signs.display(key), signs.glyphs(key), key))

    rds = readings_for(conn, key)
    print("\nProposed readings" + ("" if rds else ": none recorded"))
    for r, how in rds:
        print(fmt_reading(signs, r, how))
        if args.verbose:
            for label in ("basis", "notes"):
                if r[label]:
                    print("      %s: %s" % (label, r[label]))

    words, runs = attestations(conn, key)
    exact = [w for w in words if w["key"] == key]
    inside = [w for w in words if w["key"] != key]
    ids, sites = summarise(conn, key)
    print("\nAttested in %d inscriptions at %d sites: %s" % (
        len(ids), len(sites), ", ".join("%s %d" % kv for kv in sites.most_common())))

    def row(r, ctx):
        print("  %-12s %-18s %-16s %s" % (r["inscription_id"], (r["site"] or "?")[:18], (r["type"] or "")[:16], ctx))

    if exact:
        print("\nAs a word (editorial division)")
        for r in exact:
            row(r, word_context(conn, signs, r["inscription_id"], r["pos"]))
    if inside:
        print("\nInside a longer word")
        for r in inside:
            row(r, word_context(conn, signs, r["inscription_id"], r["pos"]))
    if runs:
        print("\nIn text with no editorial word division (mechanical runs)")
        for r in runs:
            row(r, signs.display(r["key"]))

    sim = similar_forms(conn, key)
    if sim:
        print("\nSimilar forms (one sign added, dropped or changed)")
        print("  " + ", ".join("%s (%d)" % (signs.display(k), n) for k, n in sim[:args.similar]))


def cmd_decode(args):
    conn = connect(args.db)
    signs = SignTable.from_db(conn)
    text = sys.stdin.read() if args.text == "-" else args.text
    if has_script_chars(text):
        print("Signs")
        for tok in signs.tokenize(text):
            if tok.kind == "sign":
                cat = signs.category(tok.sign_id) or "not in sign list"
                print("  %s  U+%05X  %-8s %-6s %s" % (tok.text, ord(tok.text), tok.sign_id,
                                                   signs.label(tok.sign_id), cat))
            elif tok.kind == "number":
                print("  %s  U+%05X  numeral  %d" % (tok.text, ord(tok.text), tok.value))
            elif tok.kind == "divider":
                print("  %s  U+%05X  word divider" % (tok.text, ord(tok.text)))
            elif tok.kind == "mark":
                print("  %s  U+%05X  damage mark (lineara.xyz convention)" % (tok.text, ord(tok.text)))
        print("\nTransliteration\n  " + signs.render(text).replace("\n", "\n  "))
        keys = [signs.key_from_tokens(toks) for _, toks in signs.runs(text)]
    else:
        keys = [signs.key_from_form(w) for w in re.split(r"[\s·,|]+", text.strip()) if w]

    print("\nSequences")
    for key in keys:
        print("  %-26s %s" % (signs.display(key), spread(conn, key)))
        for r, how in readings_for(conn, key):
            print(fmt_reading(signs, r, how, indent="      "))
    print("\nFor detail on one sequence: python3 -m lineara word <FORM>")


def cmd_search(args):
    conn = connect(args.db)
    signs = SignTable.from_db(conn)
    q = args.query
    rows = conn.execute(
        """SELECT id, site, type, translit_text FROM inscriptions
           WHERE id LIKE ? OR site LIKE ? OR type LIKE ? OR museum_inventory LIKE ?
           ORDER BY id""", ("%" + q + "%",) * 4).fetchall()
    for r in rows[:args.limit]:
        first = (r["translit_text"] or "").split("\n")[0]
        print("%-14s %-18s %-16s %s" % (r["id"], (r["site"] or "?")[:18], (r["type"] or "")[:16], first[:60]))
    if len(rows) > args.limit:
        print("… %d more (use --limit)" % (len(rows) - args.limit))


def cmd_readings(args):
    conn = connect(args.db)
    signs = SignTable.from_db(conn)
    q = """SELECT r.*, r.key AS matched_key, s.author, s.year, s.kind AS source_kind, s.peer_reviewed
           FROM readings r JOIN sources s ON s.id = r.source_id WHERE 1=1"""
    params = []
    if args.source:
        q += " AND r.source_id = ?"
        params.append(args.source)
    if args.confidence:
        q += " AND r.confidence = ?"
        params.append(args.confidence)
    q += " ORDER BY r.source_id, r.id"
    current = None
    for r in conn.execute(q, params):
        if r["source_id"] != current:
            current = r["source_id"]
            s = conn.execute("SELECT * FROM sources WHERE id = ?", (current,)).fetchone()
            print("\n%s — %s (%s)" % (current, s["title"], s["url"] or s["file"]))
        print("  %-22s" % r["form"] + fmt_reading(signs, r, "exact", indent=" "))


def cmd_stats(args):
    conn = connect(args.db)
    signs = SignTable.from_db(conn)
    one = lambda q: conn.execute(q).fetchone()[0]
    print("upstream       %s @ %s" % (one("SELECT value FROM meta WHERE key='upstream'"),
                                     one("SELECT value FROM meta WHERE key='upstream_commit'")[:12]))
    print("inscriptions   %d faces (%d with Unicode text, %d with editorial words)" % (
        one("SELECT count(*) FROM inscriptions"),
        one("SELECT count(*) FROM inscriptions WHERE unicode_text IS NOT NULL"),
        one("SELECT count(DISTINCT inscription_id) FROM words")))
    print("words          %d editorial, %d mechanical runs" % (one("SELECT count(*) FROM words"),
                                                              one("SELECT count(*) FROM runs")))
    print("readings       %d from %d sources" % (one("SELECT count(*) FROM readings"),
                                                one("SELECT count(*) FROM sources")))
    print("\nMost frequent editorial words (2+ signs)")
    for r in conn.execute("""SELECT key, count(*) n, count(DISTINCT inscription_id) d FROM words
                             WHERE n_signs >= 2 AND key NOT LIKE '%?%' AND key NOT LIKE '%x:%'
                             GROUP BY key ORDER BY n DESC LIMIT ?""", (args.top,)):
        print("  %-22s %3d in %3d inscriptions" % (signs.display(r["key"]), r["n"], r["d"]))


def main(argv=None):
    p = argparse.ArgumentParser(prog="python3 -m lineara", description=__doc__)
    p.add_argument("--db", type=lambda s: __import__("pathlib").Path(s), default=builder.DB_PATH)
    sub = p.add_subparsers(dest="cmd", required=True)

    s = sub.add_parser("fetch", help="download the pinned upstream corpus")
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn=cmd_fetch)

    s = sub.add_parser("build", help="fetch if needed, then (re)build lineara.db")
    s.set_defaults(fn=cmd_build)

    s = sub.add_parser("site", help="build web.db for the website")
    site_sub = s.add_subparsers(dest="site_cmd", required=True)
    d = site_sub.add_parser("data", help="export web/public/data/web.db (+ .gz)")
    d.set_defaults(fn=cmd_site)

    s = sub.add_parser("show", help="one inscription: text, words, readings")
    s.add_argument("id", help="e.g. 'IO Za 2', IOZa2, 'HT 13', 'HT 115'")
    s.set_defaults(fn=cmd_show)

    s = sub.add_parser("word", help="every attestation of a sign sequence, with readings")
    s.add_argument("form", help="transliteration (ja-sa-sa-ra-me) or Unicode (𐘱𐘞𐘞𐘴𐘋)")
    s.add_argument("-v", "--verbose", action="store_true", help="include basis and notes for readings")
    s.add_argument("--similar", type=int, default=15, help="how many similar forms to list")
    s.set_defaults(fn=cmd_word)

    s = sub.add_parser("decode", help="break a pasted snippet into signs and look up each sequence")
    s.add_argument("text", help="Unicode Linear A or transliteration; '-' reads stdin")
    s.set_defaults(fn=cmd_decode)

    s = sub.add_parser("search", help="find inscriptions by id, site, type or museum number")
    s.add_argument("query")
    s.add_argument("--limit", type=int, default=40)
    s.set_defaults(fn=cmd_search)

    s = sub.add_parser("readings", help="list recorded readings")
    s.add_argument("--source")
    s.add_argument("--confidence", choices=builder.CONFIDENCE)
    s.set_defaults(fn=cmd_readings)

    s = sub.add_parser("stats", help="corpus counts and the most frequent words")
    s.add_argument("--top", type=int, default=20)
    s.set_defaults(fn=cmd_stats)

    args = p.parse_args(argv)
    args.fn(args)
