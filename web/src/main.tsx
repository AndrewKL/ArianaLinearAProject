import { hydrateRoot } from "react-dom/client";
import { App } from "./App";
import type { PageData } from "./data/types";
import "./styles.css";

declare global {
  interface Window {
    __PAGE__?: PageData;
  }
}

const data = window.__PAGE__;
const root = document.getElementById("root");

// Every page is prerendered with its data inlined; hydration only adds behaviour.
if (data && root) hydrateRoot(root, <App data={data} />);
