import { useEffect, useState } from "react";
import type { Featured, HomeData } from "../data/types";

/**
 * Proves the second data path: the same database, queried in the browser.
 * The prerendered content above it came from the same file read in Node.
 */
function BrowserQuery() {
  const [state, setState] = useState<{ status: string; rows?: { site: string; n: number }[] }>({
    status: "idle",
  });

  async function run() {
    setState({ status: "loading the database…" });
    const started = performance.now();
    try {
      const { openDatabase } = await import("../data/browser");
      const db = await openDatabase();
      const rows = db.all<{ site: string; n: number }>(
        `SELECT coalesce(site, '?') site, count(DISTINCT inscription_id) n
           FROM attestations
          WHERE instr(' ' || key || ' ', ' ' || ? || ' ') > 0
          GROUP BY site ORDER BY n DESC`,
        ["AB57 AB31 AB31 AB60 AB13"]
      );
      setState({ status: `queried in the browser in ${Math.round(performance.now() - started)} ms`, rows });
      document.title = `SELFTEST OK ${rows.length} sites`;
    } catch (error) {
      setState({ status: `failed: ${(error as Error).message}` });
      document.title = "SELFTEST FAILED";
    }
  }

  // Lets a headless browser exercise the WebAssembly path, which Node cannot:
  // `npm run smoke` loads /?selftest and checks the result.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("selftest")) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="browser-query">
      <button onClick={run} disabled={state.status.startsWith("loading")}>
        Run a query in your browser
      </button>
      <p className="status">
        {state.status === "idle"
          ? "Loads web.db (322 KB gzipped) into SQLite compiled to WebAssembly, then asks where ja-sa-sa-ra-me occurs."
          : state.status}
      </p>
      {state.rows && (
        <ul className="sites">
          {state.rows.map((row) => (
            <li key={row.site}>
              {row.site} <b>{row.n}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The proposal a visitor most likely arrived for. Shown as a claim with an
 * owner, never in the site's own voice, and leading to the word-by-word
 * evidence rather than standing on its own.
 */
function Headline({ item }: { item: Featured }) {
  return (
    <aside className="headline">
      <p className="kicker">
        A proposed translation{item.year ? `, ${item.year}` : ""}
      </p>
      <blockquote>“{item.text}”</blockquote>
      <p className="claim">
        {item.sourceLabel} reads {item.inscriptionId}, a libation table from{" "}
        {item.site ?? "an unrecorded site"}, this way.{" "}
        {item.peerReviewed === 0 && (
          <>
            The paper is a <strong>{item.sourceKind}</strong> and has not been peer-reviewed.{" "}
          </>
        )}
        It is one reading among others, not a settled translation.
      </p>
      <p className="actions">
        <a className="go" href={`${import.meta.env.BASE_URL}texts/${item.slug}/`}>
          See {item.inscriptionId} word by word →
        </a>
        {item.sourceUrl && (
          <a href={item.sourceUrl} rel="nofollow noopener">
            the paper
          </a>
        )}
      </p>
    </aside>
  );
}

export function Home({ data }: { data: HomeData }) {
  const s = data.stats;
  return (
    <article>
      <h1>The Ariana Project: Deciphering Linear A</h1>
      <p className="lede">
        Every inscribed face of the corpus, transliterated sign by sign, beside every meaning
        anyone has proposed for it — attributed to whoever proposed it, and rated for how far it
        is accepted. The script is undeciphered; nothing here is a translation of record.
      </p>

      {data.headline && <Headline item={data.headline} />}

      <dl className="stats">
        <div>
          <dt>faces</dt>
          <dd>{s.faces.toLocaleString()}</dd>
        </div>
        <div>
          <dt>with text</dt>
          <dd>{s.withText.toLocaleString()}</dd>
        </div>
        <div>
          <dt>words</dt>
          <dd>
            {s.words.toLocaleString()} <small>({s.distinctWords.toLocaleString()} distinct)</small>
          </dd>
        </div>
        <div>
          <dt>readings</dt>
          <dd>
            {s.readings} <small>from {s.sources} sources</small>
          </dd>
        </div>
      </dl>

      <h2>Libation vessels</h2>
      <ul className="featured">
        {data.featured.map((text) => (
          <li key={text.slug}>
            <a href={`${import.meta.env.BASE_URL}texts/${text.slug}/`}>{text.id}</a>
            <span className="site">{text.site}</span>
            <span className="snippet">{text.translit}</span>
          </li>
        ))}
      </ul>

      <h2>SQLite in your browser</h2>
      <BrowserQuery />

      <p className="provenance">
        Built from corpus <code>{s.upstreamCommit}</code>.
      </p>
    </article>
  );
}
