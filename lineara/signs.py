"""Sign inventory, Unicode tokenizer, and transliteration normalisation.

Words are compared by *sign identity* (AB08, A301, ...), not by spelling.
The sources disagree on spelling: SigLA writes ``*79`` and ``A301`` where
lineara.xyz writes ``zu`` and ``*301``. Both resolve to the same key, and so
does the Unicode text, because Unicode encodes sign identities too.

A key is the sign ids joined by single spaces, e.g. ``"AB08 AB59 AB28 A301 AB54 AB57"``.
Tokens that are not a sign (``[?]``, ``vs``, ``ole``) become ``?`` or ``x:<token>``.
"""

import json
import re
import unicodedata
from collections import namedtuple

LINEAR_A_BLOCK = (0x10600, 0x1077F)
AEGEAN_BLOCK = (0x10100, 0x1013F)
WORD_DIVIDERS = {"\U00010100", "\U00010101"}

# lineara.xyz (the source of most unicode_text) uses a few code points that
# Unicode leaves unassigned, from George Douros's Aegean font.
DAMAGE_MARK = "\U0001076B"   # damage/uncertainty mark; lineara.xyz strips it before matching words
NONSTANDARD_SIGNS = {
    "\U0001076C": "A809", "\U0001076D": "A810", "\U0001076E": "A811", "\U0001076F": "A829",
    "\U000FD1EB": "AB164",   # private use; HT 17, where the source word is ra-*164-ti
}

Token = namedtuple("Token", "kind text sign_id translit value")
# kind: sign | divider | number | mark | newline | other

_NUM_WORDS = {
    "ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5, "SIX": 6, "SEVEN": 7,
    "EIGHT": 8, "NINE": 9, "TEN": 10, "TWENTY": 20, "THIRTY": 30, "FORTY": 40,
    "FIFTY": 50, "SIXTY": 60, "SEVENTY": 70, "EIGHTY": 80, "NINETY": 90,
    "HUNDRED": 100, "THOUSAND": 1000,
}


def aegean_number_value(ch):
    name = unicodedata.name(ch, "")
    if not name.startswith("AEGEAN NUMBER "):
        return None
    parts = [_NUM_WORDS[w] for w in name[len("AEGEAN NUMBER "):].split()]
    value = parts[0]
    for mult in parts[1:]:
        value *= mult
    return value


def _in(block, ch):
    return block[0] <= ord(ch) <= block[1]


def has_script_chars(text):
    return any(_in(LINEAR_A_BLOCK, ch) or _in(AEGEAN_BLOCK, ch) for ch in text)


def _bare_number(sign_id):
    return re.sub(r"^(AB|A)", "", sign_id)


class SignTable:
    """The sign inventory from signs.json, with lookups in both directions."""

    def __init__(self, entries):
        self.entries = entries
        self.by_phonetic = {}
        self.by_glyph = {}
        for sid, e in entries.items():
            if e.get("phonetic"):
                self.by_phonetic.setdefault(e["phonetic"], sid)
            glyph = e.get("unicode")
            if glyph:
                current = self.by_glyph.get(glyph)
                if current is None or self._rank(sid) < self._rank(current):
                    self.by_glyph[glyph] = sid

    def _rank(self, sid):
        # Several variant entries share a glyph (AB28 / AB28b). Prefer the one
        # with a phonetic value, then the base id.
        return (not self.entries[sid].get("phonetic"), len(sid), sid)

    @classmethod
    def load(cls, path):
        with open(path, encoding="utf-8") as f:
            raw = json.load(f)
        return cls({k: v for k, v in raw.items() if k != "provenance" and isinstance(v, dict)})

    @classmethod
    def from_db(cls, conn):
        rows = conn.execute("SELECT id, glyph, phonetic, category, primary_reading FROM signs")
        return cls({sid: {"unicode": g, "phonetic": ph, "category": cat, "primary_reading": pr}
                    for sid, g, ph, cat, pr in rows})

    def category(self, sid):
        e = self.entries.get(sid)
        return e.get("category") if e else None

    def is_syllabic(self, sid):
        return self.category(sid) == "syllabogram"

    def translit(self, sid):
        """Conventional transliteration of one sign: the Linear B-derived value, else *NNN."""
        e = self.entries.get(sid) or {}
        if e.get("phonetic"):
            return e["phonetic"]
        return "*" + _bare_number(sid)

    def label(self, sid):
        """How a non-syllabic sign is shown in running text (logograms get their Latin name)."""
        e = self.entries.get(sid) or {}
        if self.is_syllabic(sid):
            return self.translit(sid)
        reading = e.get("primary_reading")
        return reading if reading else sid

    def glyph(self, sid):
        e = self.entries.get(sid) or {}
        return e.get("unicode") or ""

    # --- Unicode -> tokens -------------------------------------------------

    def tokenize(self, text):
        tokens = []
        for ch in text:
            if ch == "\n":
                tokens.append(Token("newline", ch, None, None, None))
            elif ch in WORD_DIVIDERS:
                tokens.append(Token("divider", ch, None, None, None))
            elif ch == DAMAGE_MARK:
                tokens.append(Token("mark", ch, None, None, None))
            elif ch in self.by_glyph or ch in NONSTANDARD_SIGNS:
                sid = self.by_glyph.get(ch) or NONSTANDARD_SIGNS[ch]
                tokens.append(Token("sign", ch, sid, self.translit(sid), None))
            elif _in(AEGEAN_BLOCK, ch) and aegean_number_value(ch) is not None:
                tokens.append(Token("number", ch, None, None, aegean_number_value(ch)))
            elif _in(LINEAR_A_BLOCK, ch):
                name = unicodedata.name(ch, "")
                if name.startswith("LINEAR A SIGN "):
                    sid = name[len("LINEAR A SIGN "):].split()[0]
                    tokens.append(Token("sign", ch, sid, "*" + _bare_number(sid), None))
                else:
                    tokens.append(Token("other", ch, None, None, None))
            else:
                tokens.append(Token("other", ch, None, None, None))
        return tokens

    def runs(self, text):
        """Maximal sequences of syllabic signs, split at anything else.

        This is a mechanical segmentation: dividers, line ends, numerals and
        logograms all end a run; the damage mark does not. It will split words
        that wrap a line and join words an editor would separate.
        Yields (line_no, [Token, ...]).
        """
        line, current = 0, []
        for tok in self.tokenize(text):
            if tok.kind == "mark":
                continue
            if tok.kind == "sign" and self.is_syllabic(tok.sign_id):
                current.append(tok)
                continue
            if current:
                yield line, current
                current = []
            if tok.kind == "newline":
                line += 1
        if current:
            yield line, current

    def render(self, text):
        """Unicode text -> conventional transliteration, line breaks preserved."""
        out = []
        last = ""  # last piece written, ignoring damage marks
        prev_syllabic = False
        pending_number = None
        for tok in self.tokenize(text) + [Token("other", "", None, None, None)]:
            if tok.kind == "mark":
                out.append("¦")
                continue
            if tok.kind == "number":
                pending_number = (pending_number or 0) + tok.value
                prev_syllabic = False
                continue
            if pending_number is not None:
                out.append(" %d" % pending_number)
                last = out[-1]
                pending_number = None
            if tok.kind == "sign":
                syll = self.is_syllabic(tok.sign_id)
                if syll and prev_syllabic:
                    out.append("-")
                elif last and not last.endswith(("\n", " ")):
                    out.append(" ")
                out.append(self.label(tok.sign_id))
                prev_syllabic = syll
            else:
                prev_syllabic = False
                if tok.kind == "newline":
                    out.append("\n")
                elif tok.kind == "divider":
                    out.append(" ·")
                elif tok.text.strip():
                    out.append(" " + tok.text)
            if out:
                last = out[-1]
        text = "".join(out)
        return "\n".join(line.strip() for line in text.split("\n")).strip()

    # --- transliteration -> key -------------------------------------------

    def token_to_id(self, tok):
        t = tok.strip().rstrip("?")
        if not t:
            return None
        low = t.lower()
        if low in self.by_phonetic:
            return self.by_phonetic[low]
        m = re.fullmatch(r"\*?(AB|A)?(\d+)([a-z]?)", t, re.IGNORECASE)
        if m:
            prefix, num, sfx = (m.group(1) or "").upper(), m.group(2), m.group(3).lower()
            candidates = [prefix + num + sfx] if prefix else [
                "AB%02d%s" % (int(num), sfx), "AB%s%s" % (num, sfx), "A%s%s" % (num, sfx)]
            for c in candidates:
                if c in self.entries:
                    return c
        return None

    def key_token(self, tok):
        sid = self.token_to_id(tok)
        if sid:
            return sid
        t = tok.strip().lower()
        if t in ("[?]", "?", "[unclassified]", ""):
            return "?"
        return "x:" + t

    def key_from_form(self, form):
        """'ja-sa-sa-ra-me' / 'JA-SA-SA-RA-ME' / 'A-TA-I-*301-WA-JA' -> sign-id key."""
        return " ".join(self.key_token(t) for t in form.strip().split("-"))

    def key_from_tokens(self, tokens):
        return " ".join(t.sign_id for t in tokens if t.kind == "sign")

    def key_from_text(self, text):
        """A form typed as transliteration, or pasted as Unicode (one word)."""
        if has_script_chars(text):
            return self.key_from_tokens([t for t in self.tokenize(text) if t.kind == "sign"])
        return self.key_from_form(text)

    def display(self, key):
        """Key -> uniform uppercase transliteration, e.g. 'A-TA-I-*301-WA-JA'."""
        parts = []
        for k in key.split(" "):
            if k == "?":
                parts.append("[?]")
            elif k.startswith("x:"):
                parts.append(k[2:])
            else:
                parts.append(self.translit(k))
        return "-".join(parts).upper()

    def glyphs(self, key):
        return "".join(self.glyph(k) for k in key.split(" ") if k in self.entries)


def key_len(key):
    return len(key.split(" "))


def contains(haystack_key, needle_key):
    """True if needle is a contiguous sub-sequence of haystack (whole signs only)."""
    return (" %s " % needle_key) in (" %s " % haystack_key)


def sign_edit_distance(a, b, limit=2):
    """Levenshtein distance over signs, cut off early above `limit`."""
    a, b = a.split(" "), b.split(" ")
    if abs(len(a) - len(b)) > limit:
        return limit + 1
    prev = list(range(len(b) + 1))
    for i, x in enumerate(a, 1):
        cur = [i]
        for j, y in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x != y)))
        if min(cur) > limit:
            return limit + 1
        prev = cur
    return prev[-1]
