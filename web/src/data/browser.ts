/**
 * SQLite in the browser: fetch web.db.gz, inflate it, hand the bytes to
 * sqlite-wasm. GitHub Pages does not compress application/octet-stream, so
 * the file is pre-gzipped and inflated here with DecompressionStream.
 *
 * Single-threaded, in-memory. Pages cannot set COOP/COEP headers, so
 * SharedArrayBuffer and OPFS are unavailable by design.
 */

import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import type { Db } from "./types";

let loading: Promise<Db> | null = null;

async function fetchDatabase(base: string): Promise<Uint8Array> {
  const response = await fetch(`${base}data/web.db.gz`);
  if (!response.ok) throw new Error(`could not fetch the database: ${response.status}`);
  let bytes = new Uint8Array(await response.arrayBuffer());

  // Whether the bytes arrive still gzipped depends on the server: some send
  // .gz with Content-Encoding: gzip, and the browser has already inflated
  // them. Sniff the magic number instead of trusting headers.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    if (typeof DecompressionStream === "undefined") {
      const plain = await fetch(`${base}data/web.db`);
      if (!plain.ok) throw new Error("this browser cannot inflate gzip and web.db is unavailable");
      bytes = new Uint8Array(await plain.arrayBuffer());
    } else {
      const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new DecompressionStream("gzip"));
      bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
  }

  const header = new TextDecoder().decode(bytes.subarray(0, 15));
  if (header !== "SQLite format 3") throw new Error(`not a SQLite database (header: ${header})`);
  return bytes;
}

export function openDatabase(base = import.meta.env.BASE_URL): Promise<Db> {
  if (loading) return loading;
  loading = (async () => {
    const [sqlite3, bytes] = await Promise.all([sqlite3InitModule(), fetchDatabase(base)]);
    const db = new sqlite3.oo1.DB();
    const pointer = sqlite3.wasm.allocFromTypedArray(bytes);
    const rc = sqlite3.capi.sqlite3_deserialize(
      db.pointer!,
      "main",
      pointer,
      bytes.length,
      bytes.length,
      sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE
    );
    if (rc) throw new Error(`sqlite3_deserialize failed: ${rc}`);
    return {
      all<T>(sql: string, params: unknown[] = []): T[] {
        return db.exec({
          sql,
          bind: params as never,
          rowMode: "object",
          returnValue: "resultRows",
        }) as unknown as T[];
      },
    };
  })();
  return loading;
}

export const databaseBytes = async (base = import.meta.env.BASE_URL) => {
  const head = await fetch(`${base}data/web.db.gz`, { method: "HEAD" });
  return Number(head.headers.get("content-length") ?? 0);
};
