import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages serves a project site from /<repo>/; set BASE in CI.
const base = process.env.BASE ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  // sqlite-wasm ships its own .wasm and must not be pre-bundled.
  optimizeDeps: { exclude: ["@sqlite.org/sqlite-wasm"] },
  build: { target: "es2022", assetsInlineLimit: 0 },
});
