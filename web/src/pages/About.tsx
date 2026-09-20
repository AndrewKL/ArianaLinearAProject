import type { AboutData } from "../data/types";

/**
 * Background for a reader who arrived from a news story and wants to know who
 * the Minoans actually were.
 *
 * The prose is not written here. It lives in docs/who-were-the-minoans.md and
 * is converted to HTML by scripts/prerender.mjs, so the repository document
 * and this page are the same words — a figure corrected in one is corrected in
 * both. The HTML is ours, from a file in this repository, never user input.
 */
export function About({ data }: { data: AboutData }) {
  return <article className="prose" dangerouslySetInnerHTML={{ __html: data.html }} />;
}
