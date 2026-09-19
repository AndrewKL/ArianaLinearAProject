import type { Reading, TextData, Token } from "../data/types";

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

export function Text({ data }: { data: TextData }) {
  const t = data.text;
  const refs = [t.refs.gorila && `GORILA ${t.refs.gorila}`, t.refs.museum].filter(Boolean);
  return (
    <article>
      <h1>{t.id}</h1>
      <p className="meta">
        {[t.site, t.type?.replace("_", " "), t.period].filter(Boolean).join(" · ")}
        {refs.length > 0 && <span className="refs"> — {refs.join(" · ")}</span>}
      </p>

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
        <p className="layer-note">
          {t.wordLayer === "editorial"
            ? "Word divisions as the source gives them."
            : "No editorial word division for this face: these are mechanical runs of syllabic signs, not words."}
        </p>
        <ol className="words">
          {t.words.map((word) => (
            <li className="word" key={word.i}>
              <div className="word-head">
                <span className="form">{word.form}</span>
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
            </li>
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
    </article>
  );
}
