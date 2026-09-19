import type { PageData } from "./data/types";
import { Home } from "./pages/Home";
import { Text } from "./pages/Text";

export function App({ data }: { data: PageData }) {
  return (
    <>
      <header className="masthead">
        <a href={import.meta.env.BASE_URL}>Linear A corpus</a>
        <span className="masthead-note">undeciphered · readings are proposals, not translations</span>
      </header>
      <main>{data.route === "home" ? <Home data={data} /> : <Text data={data} />}</main>
      <footer>
        <p>
          Corpus data from{" "}
          <a href="https://github.com/Navarre-AI/linear-a">Navarre-AI/linear-a</a>, which merges{" "}
          <a href="https://sigla.phis.me/">SigLA</a> (Salgarella &amp; Castellan, CC BY-NC-SA 4.0),
          GORILA, RILA Supplement 1, J. G. Younger and <a href="https://lineara.xyz">lineara.xyz</a>.
          Non-commercial use only.
        </p>
      </footer>
    </>
  );
}
