/**
 * The map link is the one place the site sends a reader somewhere it cannot
 * check, so what it puts in the URL is worth pinning down.
 * Run: npm test
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { mapUrl, placeFor } from "./queries.ts";
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
  }
});
