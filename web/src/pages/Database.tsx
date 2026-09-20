import type { DatabaseSummary } from "../data/types";

/**
 * What is actually in the database behind this site.
 *
 * Every number here is a query, not a figure someone typed. The site makes
 * claims about coverage, and those claims go stale the moment a readings file
 * changes — this page cannot go stale, because it is recomputed on each build.
 */

const WHAT: Record<string, string> = {
  inscriptions: "one row per inscribed face, as the upstream corpus gives it",
  words: "editorial word divisions, where a source supplies them",
  runs: "mechanical segmentation: maximal runs of syllabic signs",
  signs: "the sign inventory, with sound values where Linear B supplies one",
  sign_occurrences: "per-position sign data from SigLA",
  sites: "curated findspot coordinates — see the design doc",
  readings: "proposed meanings; competing claims are separate rows",
  reading_forms: "every form a reading applies to, including declared variants",
  translations: "proposed renderings of a whole text, kept apart from word glosses",
  sources: "who proposed what, and whether it was peer-reviewed",
  images: "facsimile drawings and photographs, where they are published",
  meta: "provenance: which upstream commit this was built from",
};

function pct(part: number, whole: number) {
  return whole === 0 ? "0%" : `${((part / whole) * 100).toFixed(1)}%`;
}

export function Database({ data }: { data: DatabaseSummary }) {
  const c = data.coverage;
  return (
    <article>
      <h1>What is in the database</h1>
      <p className="lede">
        The site ships a single SQLite file and queries it in your browser. Every number on this
        page is computed from that file when the site is built, so none of it can drift away from
        what the site actually holds.
      </p>

      <h2>Tables</h2>
      <table className="db-tables">
        <thead>
          <tr>
            <th>table</th>
            <th className="num">rows</th>
            <th>what it holds</th>
          </tr>
        </thead>
        <tbody>
          {data.tables.map((t) => (
            <tr key={t.name}>
              <td>
                <code>{t.name}</code>
              </td>
              <td className="num">{t.rows.toLocaleString()}</td>
              <td className="what">{WHAT[t.name] ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>How much is understood</h2>
      <p>
        This is the number that matters, and the one most easily overstated. A word counts as
        covered if any source proposes a meaning for it or for a sequence inside it.
      </p>
      <dl className="stats">
        <div>
          <dt>word instances</dt>
          <dd>
            {c.wordInstances.toLocaleString()} <small>of {c.totalWordInstances.toLocaleString()}</small>
            <small className="pct"> {pct(c.wordInstances, c.totalWordInstances)}</small>
          </dd>
        </div>
        <div>
          <dt>distinct forms</dt>
          <dd>
            {c.forms.toLocaleString()} <small>of {c.totalForms.toLocaleString()}</small>
            <small className="pct"> {pct(c.forms, c.totalForms)}</small>
          </dd>
        </div>
        <div>
          <dt>faces touched</dt>
          <dd>
            {c.faces.toLocaleString()} <small>of {c.totalFaces.toLocaleString()}</small>
            <small className="pct"> {pct(c.faces, c.totalFaces)}</small>
          </dd>
        </div>
      </dl>
      <p className="layer-note">
        Linear A is undeciphered. Most of those proposals are contested, and several of them
        decline to state a meaning at all — recording that a word is a vessel term, or a formula
        element of unknown sense, is still an honest answer.
      </p>

      <h2>Readings by source</h2>
      <table className="db-tables">
        <thead>
          <tr>
            <th>source</th>
            <th className="num">readings</th>
            <th className="num">forms</th>
            <th>kind</th>
          </tr>
        </thead>
        <tbody>
          {data.readingsBySource.map((s) => (
            <tr key={s.label}>
              <td>{s.label}</td>
              <td className="num">{s.readings}</td>
              <td className="num">{s.forms}</td>
              <td className="what">{s.kind}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="chips">
        {data.readingsByConfidence.map((r) => (
          <li key={r.confidence} className={r.confidence}>
            {r.confidence.replace("-", " ")} <b>{r.n}</b>
          </li>
        ))}
      </ul>

      <h2>Signs</h2>
      <p>
        A sign has a sound value only where Linear B has the same sign to borrow from. Signs
        unique to Linear A are written <code>*NNN</code> — a catalogue number, not a sound.
      </p>
      <table className="db-tables">
        <thead>
          <tr>
            <th>category</th>
            <th className="num">signs</th>
            <th className="num">with a sound value</th>
          </tr>
        </thead>
        <tbody>
          {data.signsByCategory.map((s) => (
            <tr key={s.category}>
              <td>{s.category.replace("_", " ")}</td>
              <td className="num">{s.n}</td>
              <td className="num">{s.withValue}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Objects and findspots</h2>
      <div className="two-up">
        <table className="db-tables">
          <thead>
            <tr>
              <th>object type</th>
              <th className="num">faces</th>
            </tr>
          </thead>
          <tbody>
            {data.inscriptionsByType.map((t) => (
              <tr key={t.type}>
                <td>{t.type.replace("_", " ")}</td>
                <td className="num">{t.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="db-tables">
          <thead>
            <tr>
              <th>site</th>
              <th className="num">faces</th>
            </tr>
          </thead>
          <tbody>
            {data.topSites.map((s) => (
              <tr key={s.site}>
                <td>
                  {s.site}
                  {!s.located && <span className="unlocated" title="no coordinates recorded"> ?</span>}
                </td>
                <td className="num">{s.n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="layer-note">
        {data.sites.located} of {data.sites.total} sites have coordinates, {data.sites.withArticle}{" "}
        have a Wikipedia article. {data.images.files.toLocaleString()} images cover{" "}
        {data.images.faces} faces — none are published without permission, so a build without them
        is simply a build without them.
      </p>

      <p className="provenance">
        Built from corpus <code>{data.upstreamCommit}</code>.
      </p>
    </article>
  );
}
