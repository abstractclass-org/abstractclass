// The player's games, kept in the browser (storage/db.ts) until a server exists (docs/design/04-product-shape.md). A
// game is stored as its record's text, so an export is the record itself, and a later server can import it as it is.
// The id is the first 12 hex digits of the SHA-256 of its moves: the same game imported twice is one game.
import { STORES, dbAll, dbGet, dbPut } from "#lib/storage/db.ts";
import { parseRecord, type GameRecord } from "./record.ts";
import type { Manifest } from "#lib/engine/client.ts";

/** A game's branches as kept in the browser (analysis/game.svelte.ts): each node's path key (its moves, as the review's
 *  tree names them), its order, and 1 when its move was evaluated. Version 1 kept the lines. */
export type KeptBranches = { version: 1; lines: string[][] } | { version: 2; nodes: ([string, number] | [string, number, 1])[] };

export interface StoredGame {
  version: 1;
  id: string;
  record: string; // the record's text, as imported, with the cut marks added (check.ts)
  added: string; // ISO date and time
  reviewed?: ReviewMark; // the deepest review that ran to its end with the engine named in it
}

/** A review that ran to its end (design 13): the engine module's and the network's SHA-256 (the manifest's), the
 *  network's id, and the review's depth. A game exports only when its mark names the site's engine and the network set
 *  now, at the review depth set now or deeper. */
export interface ReviewMark { module: string; model: string; network: string; visits: number; at: string }

/** The mark of a review run with `manifest`'s engine and `network` at `visits`, or null when the manifest lacks them. */
export function reviewMark(manifest: Manifest, network: string, visits: number): Omit<ReviewMark, "at"> | null {
  const module = manifest.artifacts.find(a => a.kind === "module")?.sha256;
  const model = manifest.artifacts.find(a => a.kind === "model" && a.id === network)?.sha256;
  return module && model ? { module, model, network, visits } : null;
}

/** Whether `mark` covers a review with these: the same engine and network, at least as deep. */
export const reviewCovers = (mark: ReviewMark | undefined, want: Omit<ReviewMark, "at"> | null) =>
  !!mark && !!want && mark.module === want.module && mark.model === want.model && mark.visits >= want.visits;

/** Marks a game's review as done. A deeper mark for the same engine and network stays. */
export async function markReviewed(id: string, mark: Omit<ReviewMark, "at">) {
  const game = await dbGet<StoredGame>(STORES.games, id);
  if (!game || reviewCovers(game.reviewed, mark)) return;
  await dbPut(STORES.games, id, { ...game, reviewed: { ...mark, at: new Date().toISOString() } });
}

export async function gameId(moves: string[]): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(moves.join(" ")));
  return [...new Uint8Array(digest)].slice(0, 6).map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Saves a game. Returns its id, and whether the browser kept it (storage can be blocked). */
export async function saveGame(text: string, record: GameRecord): Promise<{ id: string; kept: boolean }> {
  const id = await gameId(record.moves);
  const existing = await dbGet<StoredGame>(STORES.games, id);
  if (existing) return { id, kept: true };
  const game: StoredGame = { version: 1, id, record: text, added: new Date().toISOString() };
  return { id, kept: await dbPut(STORES.games, id, game) };
}

export async function loadGame(id: string): Promise<{ game: StoredGame; record: GameRecord } | undefined> {
  const game = await dbGet<StoredGame>(STORES.games, id);
  return game && { game, record: parseRecord(game.record) };
}

/** The stored games, newest first. */
export async function listGames(): Promise<{ game: StoredGame; record: GameRecord }[]> {
  const all = await dbAll<StoredGame>(STORES.games);
  return all.sort((a, b) => b.added.localeCompare(a.added)).flatMap(game => {
    try { return [{ game, record: parseRecord(game.record) }]; } catch { return []; }
  });
}

// The game the Review link opens: the last one reviewed in this browser. Storage can be blocked, so a read or a write
// may fail, and the link then asks for a game.
const LAST_REVIEW = "learn-enclosure:last-review:1";

/** The id of the last game reviewed in this browser, or null. */
export function lastReview(): string | null {
  try {
    return localStorage.getItem(LAST_REVIEW);
  } catch {
    return null;
  }
}

/** Keeps the id of the game a review opened, or forgets it (null). */
export function rememberReview(id: string | null) {
  try {
    if (id) localStorage.setItem(LAST_REVIEW, id);
    else localStorage.removeItem(LAST_REVIEW);
  } catch {
    // Blocked storage: the Review link asks for a game.
  }
}
