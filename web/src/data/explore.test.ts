/**
 * The TypeScript half of the sign-key logic must agree with lineara/signs.py.
 * Run: npm test   (Node strips the types; no build step, no test framework)
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { displayKey, exploreWord, signEditDistance } from "./explore.ts";
import { openDatabase } from "./node.ts";

const JA_SA_SA_RA_ME = "AB57 AB31 AB31 AB60 AB13";

test("sign edit distance counts whole signs, not letters", () => {
  assert.equal(signEditDistance("AB08 AB59", "AB08 AB59"), 0);
  assert.equal(signEditDistance("AB57 AB31", "AB31"), 1); // one sign dropped
  assert.equal(signEditDistance("AB31", "AB57 AB31"), 1); // one sign added
  assert.equal(signEditDistance("AB08 AB59", "AB08 AB60"), 1); // one sign changed
  assert.equal(signEditDistance("AB08 AB59 AB28", "AB60"), 2); // beyond the limit
});

test("a long shared prefix is not a near miss", () => {
  // Two signs differ, so this must exceed the default limit of 1.
  assert.equal(signEditDistance("AB08 AB59 AB28 A301", "AB08 AB59 AB60 AB61"), 2);
});

test("display uses lowercase values, keeps sign numbers, marks unknowns", () => {
  const values = new Map([
    ["AB08", "a"],
    ["AB59", "ta"],
    ["A301", "*301"],
  ]);
  assert.equal(displayKey(values, "AB08 AB59 A301"), "a-ta-*301");
  assert.equal(displayKey(values, "AB08 ?"), "a-[?]");
  assert.equal(displayKey(values, "AB08 x:vin"), "a-vin");
});

// These need the built database; skip when it is not there.
const DB = new URL("../../public/data/web.db", import.meta.url).pathname;
const haveDb = await import("node:fs").then((fs) => fs.existsSync(DB));

test("exploring a word finds the rest of the corpus", { skip: !haveDb }, () => {
  const db = openDatabase(DB);
  const report = exploreWord(db, JA_SA_SA_RA_ME, "IO Za 2");

  assert.equal(report.form, "ja-sa-sa-ra-me");
  // Seven texts carry it; the one being read is excluded.
  assert.equal(report.exact.length, 6);
  assert.ok(report.exact.every((a) => a.id !== "IO Za 2"));
  assert.ok(report.exact.some((a) => a.id === "PL Zf 1" && a.type === "metal_object"));

  // The prefix alternation the libation formula is known for.
  const forms = report.similar.map((s) => s.form);
  assert.ok(forms.includes("a-sa-sa-ra-me"), forms.join(", "));
  assert.ok(forms.includes("sa-sa-ra-me"), forms.join(", "));
  assert.ok(!forms.includes("ja-sa-sa-ra-me"));
});

test("a word inside a longer word is reported separately", { skip: !haveDb }, () => {
  const db = openDatabase(DB);
  const report = exploreWord(db, "AB81 AB02"); // ku-ro
  assert.ok(report.exact.length > 30);
  assert.ok(report.inside.some((a) => a.form === "po-to-ku-ro"));
  // Two signs only: too short for near misses to mean anything.
  assert.equal(report.similar.length, 0);
});
