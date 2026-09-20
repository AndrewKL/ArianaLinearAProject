import { renderToString } from "react-dom/server";
import { App } from "./App";
import {
  featuredTexts,
  getDatabaseSummary,
  getStats,
  getTextPage,
  headlineTranslation,
} from "./data/queries";
import type { Db, PageData } from "./data/types";

export { featuredTexts, getDatabaseSummary, getStats, getTextPage, headlineTranslation };

/** Route -> the data that route needs. The browser gets the same object. */
export function pageData(db: Db, route: string): PageData | null {
  if (route === "/") {
    return {
      route: "home",
      stats: getStats(db),
      headline: headlineTranslation(db),
      featured: featuredTexts(db),
    };
  }
  if (route === "/about/") return null; // built by aboutData; it needs no database
  if (route === "/database/") return getDatabaseSummary(db);
  const match = /^\/texts\/([^/]+)\/$/.exec(route);
  if (match) {
    const text = getTextPage(db, match[1]);
    return text ? { route: "text", text } : null;
  }
  return null;
}

/** The about page's data. `html` comes from the markdown, converted by the
 *  prerender script, which is the only place that touches the filesystem. */
export function aboutData(html: string): PageData {
  return { route: "about", html };
}

export function render(data: PageData): string {
  return renderToString(<App data={data} />);
}

export function title(data: PageData): string {
  if (data.route === "home") return "The Ariana Project: Deciphering Linear A";
  if (data.route === "about") return "Who were the Minoans? — The Ariana Project";
  if (data.route === "database") return "What is in the database — The Ariana Project";
  return `${data.text.id} — The Ariana Project`;
}
