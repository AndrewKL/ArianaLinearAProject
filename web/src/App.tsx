import type { PageData } from "./data/types";
import { About } from "./pages/About";
import { Database } from "./pages/Database";
import { Home } from "./pages/Home";
import { Text } from "./pages/Text";

export function App({ data }: { data: PageData }) {
  return (
    <>
      <header className="masthead">
        <a href={import.meta.env.BASE_URL}>The Ariana Project</a>
        <span className="masthead-note">undeciphered · readings are proposals, not translations</span>
        <a className="masthead-link" href={`${import.meta.env.BASE_URL}about/`}>
          Who were the Minoans?
        </a>
        <a className="masthead-link near" href={`${import.meta.env.BASE_URL}database/`}>
          The data
        </a>
      </header>
      <main>
        {data.route === "home" ? (
          <Home data={data} />
        ) : data.route === "about" ? (
          <About data={data} />
        ) : data.route === "database" ? (
          <Database data={data} />
        ) : (
          <Text data={data} />
        )}
      </main>
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
