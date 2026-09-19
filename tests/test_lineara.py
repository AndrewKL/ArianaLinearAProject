import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from lineara import build as builder
from lineara.signs import SignTable, contains, sign_edit_distance

# A few real entries from signs.json, enough to exercise the tokenizer offline.
ENTRIES = {
    "AB08": {"phonetic": "a", "category": "syllabogram", "unicode": "\U00010607"},
    "AB59": {"phonetic": "ta", "category": "syllabogram", "unicode": "\U00010633"},
    "AB28": {"phonetic": "i", "category": "syllabogram", "unicode": "\U0001061A"},
    "AB28b": {"phonetic": None, "category": "syllabogram", "unicode": "\U0001061A"},
    "A301": {"phonetic": None, "category": "syllabogram", "unicode": "\U00010655"},
    "AB54": {"phonetic": "wa", "category": "syllabogram", "unicode": "\U0001062E"},
    "AB57": {"phonetic": "ja", "category": "syllabogram", "unicode": "\U00010631"},
    "AB79": {"phonetic": "zu", "category": "syllabogram", "unicode": "\U00010640"},
    "AB81": {"phonetic": "ku", "category": "syllabogram", "unicode": "\U0001063C"},
    "AB02": {"phonetic": "ro", "category": "syllabogram", "unicode": "\U00010601"},
    "AB120": {"phonetic": None, "category": "logogram", "unicode": "\U00010649",
              "primary_reading": "AB120/GRA"},
}
ATAI = "\U00010607\U00010633\U0001061A\U00010655\U0001062E\U00010631"  # A-TA-I-*301-WA-JA
KURO = "\U0001063C\U00010601"                                            # KU-RO
DIVIDER, MARK, TEN = "\U00010101", "\U0001076B", "\U00010110"


class SignTableTest(unittest.TestCase):
    def setUp(self):
        self.s = SignTable(ENTRIES)

    def test_spellings_and_unicode_share_a_key(self):
        key = "AB08 AB59 AB28 A301 AB54 AB57"
        self.assertEqual(self.s.key_from_form("a-ta-i-*301-wa-ja"), key)
        self.assertEqual(self.s.key_from_form("A-TA-I-A301-WA-JA"), key)  # SigLA style
        self.assertEqual(self.s.key_from_text(ATAI), key)
        self.assertEqual(self.s.key_from_form("*79"), self.s.key_from_form("zu"))

    def test_variant_glyph_prefers_base_sign(self):
        self.assertEqual(self.s.by_glyph["\U0001061A"], "AB28")

    def test_non_signs_in_forms(self):
        self.assertEqual(self.s.key_from_form("a-[?]"), "AB08 ?")
        self.assertEqual(self.s.key_from_form("ku-ro-vin"), "AB81 AB02 x:vin")

    def test_display(self):
        self.assertEqual(self.s.display(self.s.key_from_text(ATAI)), "A-TA-I-*301-WA-JA")

    def test_render(self):
        text = ATAI + DIVIDER + KURO + TEN + "\U00010108" + "\n" + "\U00010649"
        self.assertEqual(self.s.render(text), "a-ta-i-*301-wa-ja · ku-ro 12\nAB120/GRA")

    def test_damage_mark_does_not_split_runs(self):
        runs = list(self.s.runs(KURO[0] + MARK + KURO[1]))
        self.assertEqual([self.s.key_from_tokens(t) for _, t in runs], ["AB81 AB02"])

    def test_runs_split_at_dividers_numbers_logograms_lines(self):
        text = ATAI + DIVIDER + KURO + TEN + KURO + "\U00010649" + KURO + "\n" + KURO
        runs = [(line, self.s.key_from_tokens(t)) for line, t in self.s.runs(text)]
        self.assertEqual([k for _, k in runs], [self.s.key_from_text(ATAI)] + ["AB81 AB02"] * 4)
        self.assertEqual(runs[-1][0], 1)

    def test_contains_whole_signs_only(self):
        self.assertTrue(contains("AB81 AB02", "AB81"))
        self.assertFalse(contains("AB81 AB02", "AB8"))

    def test_edit_distance(self):
        self.assertEqual(sign_edit_distance("A B C", "A B C"), 0)
        self.assertEqual(sign_edit_distance("J A B C", "A B C"), 1)
        self.assertEqual(sign_edit_distance("A B C", "A X C"), 1)


class ReadingsValidationTest(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(":memory:")
        self.conn.executescript(builder.SCHEMA)
        self.conn.execute("INSERT INTO inscriptions (id) VALUES ('HT 13')")
        self.conn.execute("INSERT INTO words VALUES ('HT 13', 0, 'ku-ro', 'AB81 AB02', 2)")
        self.signs = SignTable(ENTRIES)
        self.dir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.dir.cleanup()

    def load(self, readings, source=None):
        doc = {"source": source or {"id": "t", "author": "A. Author", "title": "T", "kind": "article"},
               "readings": readings}
        Path(self.dir.name, "t.json").write_text(json.dumps(doc), encoding="utf-8")
        notes = []
        n = builder.load_readings(self.conn, self.signs, self.dir.name, warn=notes.append)
        return n, notes

    def test_valid_reading_loads_with_variants(self):
        n, notes = self.load([{"form": "ku-ro", "variants": ["zu-ro"], "gloss": "total",
                               "kind": "accounting", "confidence": "widely-accepted",
                               "proposed_on": "HT 13"}])
        self.assertEqual(n, 1)
        keys = {k for (k,) in self.conn.execute("SELECT key FROM reading_forms")}
        self.assertEqual(keys, {"AB81 AB02", "AB79 AB02"})
        self.assertEqual(len(notes), 1)  # zu-ro is not attested

    def test_rejects_bad_confidence(self):
        with self.assertRaises(builder.ReadingsError):
            self.load([{"form": "ku-ro", "gloss": "x", "kind": "k", "confidence": "certain"}])

    def test_rejects_unknown_inscription(self):
        with self.assertRaises(builder.ReadingsError):
            self.load([{"form": "ku-ro", "gloss": "x", "kind": "k", "confidence": "debated",
                        "proposed_on": "HT 9999"}])

    def test_rejects_unresolvable_form(self):
        with self.assertRaises(builder.ReadingsError):
            self.load([{"form": "ku-vin", "gloss": "x", "kind": "k", "confidence": "debated"}])


@unittest.skipUnless(builder.DB_PATH.exists(), "run `python3 -m lineara build` first")
class CorpusTest(unittest.TestCase):
    """Checks against the built database."""

    @classmethod
    def setUpClass(cls):
        cls.conn = sqlite3.connect(str(builder.DB_PATH))
        cls.signs = SignTable.from_db(cls.conn)

    def keys(self, table, iid):
        return [k for (k,) in self.conn.execute(
            "SELECT key FROM %s WHERE inscription_id = ? ORDER BY pos" % table, (iid,))]

    def test_io_za_2_runs_match_editorial_words(self):
        words = self.keys("words", "IO Za 2")
        self.assertEqual([self.signs.display(k) for k in words], [
            "A-TA-I-*301-WA-JA", "JA-DI-KI-TU", "JA-SA-SA-RA-ME", "U-NA-KA-NA-SI",
            "I-PI-NA-MA", "SI-RU-TE", "TA-NA-RA-TE-U-TI-NU"])
        # The mechanical layer agrees, plus the trailing I-DA[...] fragment.
        self.assertEqual(self.keys("runs", "IO Za 2"), words + ["AB28"])

    def test_ht_13_ku_ro_is_the_sum(self):
        text = self.conn.execute("SELECT translit_text FROM inscriptions WHERE id='HT 13'").fetchone()[0]
        self.assertIn("ku-ro 130", text)

    def test_every_reading_form_is_attested(self):
        rows = self.conn.execute(
            """SELECT r.form FROM readings r WHERE NOT EXISTS (
                 SELECT 1 FROM attestations a
                 WHERE instr(' ' || a.key || ' ', ' ' || r.key || ' ') > 0)""").fetchall()
        self.assertEqual(rows, [])

    def test_upstream_words_mostly_resolve_to_signs(self):
        total, clean = self.conn.execute(
            "SELECT count(*), sum(key NOT LIKE '%x:%') FROM words").fetchone()
        self.assertGreater(clean / total, 0.97)


if __name__ == "__main__":
    unittest.main()
