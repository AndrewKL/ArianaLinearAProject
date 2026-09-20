/**
 * The map link is the one place the site sends a reader somewhere it cannot
 * check, so what it puts in the URL is worth pinning down.
 * Run: npm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { getDatabaseSummary, mapUrl, placeFor } from "./queries.ts";
import { openDatabase } from "./node.ts";

test("coordinates go to the point itself", () => {
  const url = mapUrl({ label: "Mount Juktas", region: "Crete", lat: 35.2467, lon: 25.1556 });
  assert.equal(url, "https://www.google.com/maps/search/?api=1&query=35.2467%2C25.1556");
});

test("without coordinates the link searches by name, and says where", () => {
  const url = mapUrl({ label: "Kardamoutsa", region: "Crete", lat: null, lon: null });
  assert.equal(url, "https://www.google.com/maps/search/?api=1&query=Kardamoutsa%2C%20Crete");
});

test("a site with no region still produces a usable search", () => {
  const url = mapUrl({ label: "Margiana", region: null, lat: null, lon: null });
  assert.equal(url, "https://www.google.com/maps/search/?api=1&query=Margiana");
});

// Needs the built database; skipped when it is not there.
const DB = new URL("../../public/data/web.db", import.meta.url).pathname;
const haveDb = await import("node:fs").then((fs) => fs.existsSync(DB));

test("every findspot in the corpus resolves to a place", { skip: !haveDb }, () => {
  const db = openDatabase(DB);
  const sites = db.all<{ site: string }>(
    "SELECT DISTINCT site FROM inscriptions WHERE site IS NOT NULL"
  );
  assert.ok(sites.length > 0, "the corpus should name some sites");
  for (const { site } of sites) {
    const place = placeFor(db, site);
    assert.ok(place, `no gazetteer entry for ${site}`);
    assert.ok(place.mapUrl.startsWith("https://www.google.com/maps/"), site);
    // A point must declare what it marks; a nameless search must not pretend to.
    assert.equal(place.lat === null, place.precision === null, site);
    // An article link only exists where an item was cited for the position,
    // so the two can never describe different places.
    if (place.wikipediaUrl) {
      assert.ok(place.wikidata, `${site} links an article with no item behind it`);
      assert.ok(place.wikipediaUrl.startsWith("https://en.wikipedia.org/wiki/"), site);
      assert.ok(!place.wikipediaUrl.includes(" "), `${site} has an unescaped space`);
    }
  }
});

test("an article title keeps its canonical URL form", { skip: !haveDb }, () => {
  const db = openDatabase(DB);
  assert.equal(
    placeFor(db, "Mallia")?.wikipediaUrl,
    "https://en.wikipedia.org/wiki/Malia,_Crete"
  );
  assert.equal(
    placeFor(db, "Thera")?.wikipediaUrl,
    "https://en.wikipedia.org/wiki/Akrotiri_(prehistoric_city)"
  );
});

test("the database summary counts itself rather than being told", { skip: !haveDb }, () => {
  const db = openDatabase(DB);
  const s = getDatabaseSummary(db);

  // Every table the page lists must exist and be non-empty.
  for (const t of s.tables) assert.ok(t.rows > 0, `${t.name} is empty`);
  assert.ok(s.tables.some((t) => t.name === "inscriptions" && t.rows > 1000));

  // Coverage is a subset of the whole, never more.
  assert.ok(s.coverage.wordInstances <= s.coverage.totalWordInstances);
  assert.ok(s.coverage.forms <= s.coverage.totalForms);
  assert.ok(s.coverage.faces <= s.coverage.totalFaces);

  // A sound value can only come from a sign Linear B shares, so the
  // A-series categories must report none.
  const syllabograms = s.signsByCategory.find((c) => c.category === "syllabogram");
  assert.ok(syllabograms && syllabograms.withValue > 0);

  // Sources are shown by label, never by a raw id.
  for (const row of s.readingsBySource) {
    assert.ok(!row.label.includes("-20"), `${row.label} looks like an id, not a label`);
  }
  assert.ok(s.sites.located > 0 && s.sites.located <= s.sites.total);
});
