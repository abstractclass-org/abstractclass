// The player's games, kept in the browser (@abstractclass/storage/db.ts) until a server exists
// (docs/design/04-product-shape.md). A game is stored as its record's text, so an export is the record itself, and a
// later server can import it as it is. The id is the first 12 hex digits of the SHA-256 of its moves: the same game
// imported twice is one game.
import { STORES, dbAll, dbDelete, dbGet, dbPut } from "@abstractclass/storage/db.ts";
import { makeEarlierRemovalDue } from "#lib/analysis/cache.ts";
import { keepStorage } from "@abstractclass/storage/persist.ts";
import { readLocal, writeLocal } from "@abstractclass/storage/local.ts";
import { parseRecord, type GameRecord } from "./record.ts";
import { sha256Hex } from "@abstractclass/engine/artifacts.ts";
import { setUpStart } from "#lib/engine/notation.ts";
import { modelOf, moduleOf, searchModules, type Manifest } from "@abstractclass/engine/client.ts";
import { pathKey } from "#lib/review/tree.ts";
import type { GamePartner } from "./partners.ts";

/** A game's branches as kept in the browser (analysis/game.svelte.ts): each node's path key (its moves, as the review's
 *  tree names them), its order, and 1 when its move was evaluated. Version 1 kept the lines. */
export type KeptBranches = { version: 1; lines: string[][] } | { version: 2; nodes: BranchNode[] };
export type BranchNode = [string, number] | [string, number, 1];
/** A kept node: its path key, its order among its parent's branches, and the mark of a move evaluated on request. */
export const keptNode = (key: string, order: number, judged?: unknown): BranchNode => (judged ? [key, order, 1] : [key, order]);
/** The Analysis board as kept in the browser (design 21): every node of its tree, the main line's too, and the main
 *  line. One board in each browser, under BOARD_ID in the branches' store. */
export interface KeptBoard { version: 2; nodes: BranchNode[]; main: string[]; start?: string } // start: a set-up position (design 21)
export const BOARD_ID = "board";

/** The kept branches as version 2's nodes: a version 1 line is the node at its end, in the lines' order. */
export const branchNodes = (b: KeptBranches | null): BranchNode[] =>
  !b ? [] : b.version === 2 ? b.nodes : b.lines.map((l, i): BranchNode => [pathKey(l), i]);

export interface StoredGame {
  version: 1;
  id: string;
  record: string; // the record's text, as imported, with the cut marks added (check.ts)
  added: string; // ISO date and time
  reviewed?: ReviewMark; // the deepest review that ran to its end with the engine named in it
  settings?: GameSettings; // the review settings it came with, when it keeps them
  partner?: GamePartner; // the partner site it came from by a link, which takes its review back (design 18)
}

/** The review settings that a game keeps (design 13): the network and the review's visits that an imported review file
 *  or a shared link came with, so that its review is the one it came with. The browser's own settings serve every
 *  other game. */
export interface GameSettings { network: string; visits: number }

/** Keeps the partner site that a game came from, and its save page (partners.ts). */
export async function setGamePartner(id: string, partner: GamePartner) {
  const game = await dbGet<StoredGame>(STORES.games, id);
  if (game) await dbPut(STORES.games, id, { ...game, partner });
}

/** Keeps a game's own review settings. */
export async function setGameSettings(id: string, settings: GameSettings) {
  const game = await dbGet<StoredGame>(STORES.games, id);
  if (game) await dbPut(STORES.games, id, { ...game, settings });
}

/** A review that ran to its end (design 13): the engine module's and the network's SHA-256 (the manifest's), the
 *  network's id, and the review's depth. A game exports only when its mark names a module of the site's search, the
 *  network set now, and the review depth set now or deeper. `search` is the module's search, which keys the review's
 *  results (analysis/cache.ts): a snapshot reads them by their keys (design 20). An older mark, which the site kept
 *  before marks held their search, has none. */
export interface ReviewMark { module: string; model: string; network: string; visits: number; at: string; search?: string }
/** A review to compare a mark with: its mark, and the modules whose search is its module's (client.ts, searchModules). */
export interface WantedReview extends Omit<ReviewMark, "at"> { modules: string[] }

/** The mark of a review run with `manifest`'s engine and `network` at `visits`, or null when the manifest lacks them. */
export function reviewMark(manifest: Manifest, network: string, visits: number): WantedReview | null {
  const m = moduleOf(manifest), module = m?.sha256, model = modelOf(manifest, network)?.sha256;
  return module && model
    ? { module, model, network, visits, ...(m?.search ? { search: m.search } : {}), modules: searchModules(manifest) }
    : null;
}

/** Whether `mark` covers a review with these: the same search and network, at least as deep. */
export const reviewCovers = (mark: ReviewMark | undefined, want: WantedReview | null) =>
  !!mark && !!want && want.modules.includes(mark.module) && mark.model === want.model && mark.visits >= want.visits;

/** Why a game reviewed before is reviewed again, when the site changed and the player did not: "engine" when the
 *  engine's search changed, "network" when the same network has another file, null otherwise (no review before, or the
 *  player chose another network or a deeper review). The stored results are keyed by both, so the review runs again.
 *  The page tells the player why (design 11). */
export function reviewAgainWhy(mark: ReviewMark | undefined, want: WantedReview | null): "engine" | "network" | null {
  if (!mark || !want || mark.network !== want.network) return null;
  if (!want.modules.includes(mark.module)) return "engine";
  return mark.model !== want.model ? "network" : null;
}

/** Whether a new mark replaces a mark of another engine module or network file: the earlier one's results, which its
 *  snapshot read, may then be of no use (design 20). */
export const replacesAnother = (before: ReviewMark | undefined, mark: Omit<ReviewMark, "at">) =>
  !!before && (before.module !== mark.module || before.model !== mark.model);

/** Marks a game's review as done. A deeper mark of the same search and network stays: it takes the search's name when
 *  it has none (an older mark), so that its snapshot after a later release reads its keys. */
export async function markReviewed(id: string, { modules, ...mark }: WantedReview) {
  const game = await dbGet<StoredGame>(STORES.games, id), before = game?.reviewed;
  if (!game) return;
  if (before && reviewCovers(before, { ...mark, modules })) {
    if (!before.search && mark.search) await dbPut(STORES.games, id, { ...game, reviewed: { ...before, search: mark.search } });
    return;
  }
  await dbPut(STORES.games, id, { ...game, reviewed: { ...mark, at: new Date().toISOString() } });
  if (replacesAnother(before, mark)) makeEarlierRemovalDue();
}

export async function gameId(moves: string[], start?: string): Promise<string> {
  // A set-up start comes before the moves, so that the same moves from two starts are two games. A game from the
  // standard start keeps the id of its moves alone, as before.
  return (await sha256Hex(new TextEncoder().encode((start ? `${start} | ` : "") + moves.join(" ")))).slice(0, 12);
}

/** Saves a game. Returns its id, and whether the browser kept it (storage can be blocked). */
export async function saveGame(text: string, record: GameRecord): Promise<{ id: string; kept: boolean }> {
  const id = await gameId(record.moves, setUpStart(record.tags.Position));
  const existing = await dbGet<StoredGame>(STORES.games, id);
  if (existing) return { id, kept: true };
  const game: StoredGame = { version: 1, id, record: text, added: new Date().toISOString() };
  const kept = await dbPut(STORES.games, id, game);
  if (kept) void keepStorage(); // the player now has something to lose
  return { id, kept };
}

export async function loadGame(id: string): Promise<{ game: StoredGame; record: GameRecord } | undefined> {
  const game = await dbGet<StoredGame>(STORES.games, id);
  return game && { game, record: parseRecord(game.record) };
}

/** The stored games, newest first. */
export async function listGames(): Promise<{ game: StoredGame; record: GameRecord }[]> {
  return readGames((await dbAll<StoredGame>(STORES.games)).sort((a, b) => b.added.localeCompare(a.added)));
}

/** Stored games with their records read. A game whose record does not read is left out: it cannot open. */
export const readGames = (games: StoredGame[]) => games.flatMap(game => {
  try { return [{ game, record: parseRecord(game.record) }]; } catch { return []; }
});

/** Deletes a game, its branches, and the Review link's pointer to it, for good: the player confirmed it (design 11).
 *  The site's engine's analyses stay: they belong to positions, which other games can share, and an import of the same
 *  game then opens its review from them at once. An earlier engine's, which only the game's snapshot read, go at a
 *  later start, unless another game needs them (design 20). */
export async function deleteGame(id: string) {
  await Promise.all([dbDelete(STORES.games, id), dbDelete(STORES.branches, id)]);
  if (lastReview() === id) rememberReview(null);
  makeEarlierRemovalDue();
}

// The game the Review link opens: the last one reviewed in this browser. Storage can be blocked, so a read or a write
// may fail, and the link then asks for a game. The review page's head reads it too (review/pageMarks.ts).
export const LAST_REVIEW = "learn-enclosure:last-review:1";

/** The id of the last game reviewed in this browser, or null. */
export const lastReview = (): string | null => readLocal(LAST_REVIEW);

/** Keeps the id of the game a review opened, or forgets it (null). */
export const rememberReview = (id: string | null) => writeLocal(LAST_REVIEW, id);
