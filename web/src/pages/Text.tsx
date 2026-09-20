import { useCallback, useState } from "react";
import type { WordReport } from "../data/explore";
import type { Image, Place, Reading, TextData, Token, Word } from "../data/types";

const CONFIDENCE_BARS: Record<Reading["confidence"], string> = {
  established: "▰▰▰▰",
  "widely-accepted": "▰▰▰▱",
  debated: "▰▰▱▱",
  speculative: "▱▱▱▱",
};

/**
 * One sign, stacked: glyph above its conventional value. This is the
 * alignment model at sign level. The glyph layer is aria-hidden because
 * assistive technology cannot pronounce Linear A; the transliteration
 * carries the meaning for a screen reader.
 */
function TokenCell({ token }: { token: Token }) {
  switch (token.k) {
    case "sign":
      return (
        <span className="cell">
          <span className="glyph" aria-hidden="true">
            {token.g}
          </span>
          <span className={token.novalue ? "translit novalue" : "translit"}>{token.t}</span>
        </span>
      );
    case "logo":
    case "frac":
      return (
        <span className="cell">
          <span className="glyph" aria-hidden="true">
            {token.g}
          </span>
          <span className="translit logo">{token.t}</span>
        </span>
      );
    case "num":
      return (
        <span className="cell">
          <span className="glyph num" aria-hidden="true">
            {token.v}
          </span>
          <span className="translit logo">{token.v}</span>
        </span>
      );
    case "div":
      return (
        <span className="cell divider" aria-hidden="true">
          <span className="glyph">·</span>
          <span className="translit">·</span>
        </span>
      );
    case "mark":
      return (
        <span className="cell mark" title="damaged or uncertain here">
          <span className="glyph" aria-hidden="true">
            ¦
          </span>
          <span className="translit">¦</span>
        </span>
      );
  }
}

function ReadingRow({ reading }: { reading: Reading }) {
  return (
    <li className={`reading ${reading.confidence}`}>
      <span className="bars" aria-hidden="true">
        {CONFIDENCE_BARS[reading.confidence]}
      </span>
      <span className="confidence">{reading.confidence.replace("-", " ")}</span>
      <span className="gloss">{reading.gloss}</span>
      <span className="attribution">
        {[
          `— ${reading.sourceLabel}`,
          reading.peerReviewed === 0 ? "not peer-reviewed" : "",
          reading.scope === "part" ? `on the part ${reading.matchedForm.toLowerCase()}` : "",
        ]
          .filter(Boolean)
          .join(", ")}
      </span>
    </li>
  );
}

function Attestations({ report, here }: { report: WordReport; here: string }) {
  const base = import.meta.env.BASE_URL;
  return (
    <>
      {report.exact.length > 0 ? (
        <>
          <h4>
            Also on {report.exact.length} {report.exact.length === 1 ? "text" : "texts"}
          </h4>
          <ul className="hits">
            {report.exact.map((hit) => (
              <li key={hit.id}>
                <a href={`${base}texts/${hit.slug}/`}>{hit.id}</a>
                <span>{hit.site ?? "?"}</span>
                <span>{hit.type?.replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="no-reading">Found nowhere else in the corpus.</p>
      )}

      {report.inside.length > 0 && (
        <>
          <h4>Inside a longer word</h4>
          <ul className="hits">
            {report.inside.map((hit) => (
              <li key={hit.id + hit.key}>
                <a href={`${base}texts/${hit.slug}/`}>{hit.id}</a>
                <span className="form-inline">{hit.form}</span>
                <span>{hit.site ?? "?"}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

/**
 * One word, expandable. Opening it loads the corpus database into the browser
 * and asks where else these signs occur, and which forms are one sign away —
 * the prefix alternation (ja- / a- / none) that runs through the libation
 * formula shows up here.
 */
function WordEntry({ word, here }: { word: Word; here: string }) {
  const [open, setOpen] = useState(false);
  const [report, setReport] = useState<WordReport | null>(null);
  const [status, setStatus] = useState<string>("");

  const explore = useCallback(
    async (key: string) => {
      setStatus("searching the corpus…");
      try {
        const [{ openDatabase }, { exploreWord }] = await Promise.all([
          import("../data/browser"),
          import("../data/explore"),
        ]);
        const db = await openDatabase();
        setReport(exploreWord(db, key, key === word.key ? here : undefined));
        setStatus("");
      } catch (error) {
        setStatus(`could not search: ${(error as Error).message}`);
      }
    },
    [word.key, here]
  );

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !report && !status) void explore(word.key);
  }

  const showingOther = report && report.key !== word.key;

  return (
    <li className="word">
      <div className="word-head">
        <button className="form" onClick={toggle} aria-expanded={open}>
          <span className="caret" aria-hidden="true">
            {open ? "▾" : "▸"}
          </span>
          {word.glyphs && (
            <span className="word-glyphs" aria-hidden="true">
              {word.glyphs}
            </span>
          )}
          <span className="word-form">{word.form}</span>
        </button>
        <span className="attest">
          {word.attest.texts === 1
            ? "only here"
            : `${word.attest.texts} texts · ${word.attest.sites} sites`}
        </span>
      </div>

      {word.readings.length > 0 ? (
        <ul className="readings">
          {word.readings.map((reading, i) => (
            <ReadingRow reading={reading} key={i} />
          ))}
        </ul>
      ) : (
        <p className="no-reading">No reading recorded.</p>
      )}

      {open && (
        <div className="explore">
          {status && <p className="status">{status}</p>}
          {report && (
            <>
              {showingOther && (
                <p className="showing">
                  Showing <b>{report.form}</b>.{" "}
                  <button className="linkish" onClick={() => void explore(word.key)}>
                    back to {word.form}
                  </button>
                </p>
              )}
              <Attestations report={report} here={here} />
              {report.similar.length > 0 && (
                <>
                  <h4>Similar forms — one sign added, dropped or changed</h4>
                  <ul className="similar">
                    {report.similar.map((form) => (
                      <li key={form.key}>
                        <button className="linkish" onClick={() => void explore(form.key)}>
                          {form.form}
                        </button>
                        <span className="count">{form.texts}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

const IMAGE_LABEL: Record<Image["kind"], string> = {
  facsimile: "Facsimile drawing",
  photograph: "Photograph",
};

/**
 * The drawing first: it is what the transliteration was read from and stays
 * legible small; the photograph is the evidence behind the drawing. Each
 * carries its own credit, because the two may not always share a source.
 */
function Plates({ images, id }: { images: Image[]; id: string }) {
  if (images.length === 0) return null;
  const base = import.meta.env.BASE_URL;
  return (
    <aside className="plates">
      {images.map((image) => (
        <figure key={image.src}>
          <a href={`${base}img/${image.src}`}>
            <img
              src={`${base}img/${image.src}`}
              width={image.width ?? undefined}
              height={image.height ?? undefined}
              loading="lazy"
              decoding="async"
              alt={`${IMAGE_LABEL[image.kind]} of ${id}. The text is transcribed beside it.`}
            />
          </a>
          <figcaption>
            <a href={`${base}img/${image.src}`}>{IMAGE_LABEL[image.kind]} — full size</a>
            <span className="credit">{image.credit}</span>
          </figcaption>
        </figure>
      ))}
    </aside>
  );
}

/**
 * The findspot, linked to a map. What the pin marks varies — a peak
 * sanctuary is a point, "Crete" is an island — so the precision is stated
 * rather than left for the reader to assume from the zoom level. With no
 * coordinates the link is a search by name, which claims nothing.
 */
const PRECISION_NOTE: Record<NonNullable<Place["precision"]>, string> = {
  site: "the excavated site",
  locality: "the place it lies in, not the excavation itself",
  region: "only the region is recorded",
};

function Findspot({ place, fallback }: { place: Place | null; fallback: string | null }) {
  if (!place) return <>{fallback ?? "findspot not recorded"}</>;
  const note = place.precision
    ? PRECISION_NOTE[place.precision]
    : "no coordinates recorded; this searches by name";
  return (
    <>
      <a className="findspot" href={place.mapUrl} rel="noopener" title={`Google Maps — ${note}`}>
        {place.label}
        <span aria-hidden="true"> ⌖</span>
        <span className="visually-hidden"> — on Google Maps, {note}</span>
      </a>
      {place.wikipediaUrl && (
        <a
          className="findspot-wiki"
          href={place.wikipediaUrl}
          rel="nofollow noopener"
          title={`${place.label} on Wikipedia`}
        >
          wiki<span className="visually-hidden">pedia article on {place.label}</span>
        </a>
      )}
    </>
  );
}

export function Text({ data }: { data: TextData }) {
  const t = data.text;
  const refs = [t.refs.gorila && `GORILA ${t.refs.gorila}`, t.refs.museum].filter(Boolean);
  return (
    <article>
      <h1>{t.id}</h1>
      <p className="meta">
        <Findspot place={t.place} fallback={t.site} />
        {[t.type?.replace("_", " "), t.period].filter(Boolean).map((part) => ` · ${part}`)}
        {refs.length > 0 && <span className="refs"> — {refs.join(" · ")}</span>}
      </p>

      <div className={t.images.length > 0 ? "with-plates" : undefined}>
        <Plates images={t.images} id={t.id} />
        <div className="reading-column">
      <section className="text-block" aria-label={`Transliteration of ${t.id}`}>
        {t.lines.map((line) => (
          <p className="line" key={line.n}>
            {line.tokens.map((token, i) => (
              <TokenCell token={token} key={i} />
            ))}
          </p>
        ))}
      </section>

      <section>
        <h2>Meaning and attestation</h2>
        <p className="layer-note hint">
          Select a word to search the rest of the corpus for it.
        </p>
        <p className="layer-note">
          {t.wordLayer === "editorial"
            ? "Word divisions as the source gives them."
            : "No editorial word division for this face: these are mechanical runs of syllabic signs, not words."}
        </p>
        <ol className="words">
          {t.words.map((word) => (
            <WordEntry word={word} here={t.id} key={word.i} />
          ))}
        </ol>
      </section>

      {t.translations.length > 0 && (
        <section>
          <h2>Proposed as a continuous text</h2>
          {t.translations.map((translation, i) => (
            <figure className="translation" key={i}>
              <blockquote>“{translation.text}”</blockquote>
              <figcaption>
                — {translation.sourceLabel},{" "}
                {translation.sourceUrl ? (
                  <a href={translation.sourceUrl} rel="nofollow noopener">
                    {translation.sourceTitle}
                  </a>
                ) : (
                  translation.sourceTitle
                )}
                {translation.peerReviewed === 0 && `. ${translation.sourceKind}, not peer-reviewed`}
              </figcaption>
              {translation.notes && <p className="rests-on">{translation.notes}</p>}
            </figure>
          ))}
        </section>
      )}
        </div>
      </div>
    </article>
  );
}
