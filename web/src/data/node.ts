/**
 * The prerender step's database adapter: node:sqlite, built into Node 22.
 * Satisfies the same `Db` interface the browser adapter does, so every query
 * in queries.ts runs identically in both places.
 */

import { DatabaseSync } from "node:sqlite";
import type { Db } from "./types";

export function openDatabase(path: string): Db {
  const db = new DatabaseSync(path, { readOnly: true });
  return {
    all<T>(sql: string, params: unknown[] = []): T[] {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
  };
}
