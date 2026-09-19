import { renderToString } from "react-dom/server";
import { App } from "./App";
import { featuredTexts, getStats, getTextPage } from "./data/queries";
import type { Db, PageData } from "./data/types";

export { featuredTexts, getStats, getTextPage };

/** Route -> the data that route needs. The browser gets the same object. */
export function pageData(db: Db, route: string): PageData | null {
  if (route === "/") {
    return { route: "home", stats: getStats(db), featured: featuredTexts(db) };
  }
  const match = /^\/texts\/([^/]+)\/$/.exec(route);
  if (match) {
    const text = getTextPage(db, match[1]);
    return text ? { route: "text", text } : null;
  }
  return null;
}

export function render(data: PageData): string {
  return renderToString(<App data={data} />);
}

export function title(data: PageData): string {
  return data.route === "home"
    ? "Linear A corpus"
    : `${data.text.id} — Linear A corpus`;
}
