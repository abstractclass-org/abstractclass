// The player's games, kept in the browser (storage/db.ts) until a server exists (docs/design/04-product-shape.md). A
// game is stored as its record's text, so an export is the record itself, and a later server can import it as it is.
// The id is the first 12 hex digits of the SHA-256 of its moves: the same game imported twice is one game.
import { STORES, dbAll, dbGet, dbPut } from "#lib/storage/db.ts";
import { parseRecord, type GameRecord } from "./record.ts";

export interface StoredGame {
  version: 1;
  id: string;
  record: string; // the record's text, as imported, with the cut marks added (check.ts)
  added: string; // ISO date and time
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
