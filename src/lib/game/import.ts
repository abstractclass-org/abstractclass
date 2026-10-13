// A game record into the player's games: checked with the engine's rules (check.ts), given its cut marks, and kept in
// this browser (store.ts). The pages that import (Home, and the review's ways in, Arrival.svelte) show the outcome.
import { checkMoves } from "./check.ts";
import { markCuts, type GameRecord } from "./record.ts";
import { saveGame } from "./store.ts";

/** Why the site cannot review a game of another variant, or from another start, or null. The notation names them with
 *  the `Rules` and `Position` tags, which a game of the online rules from the standard start leaves out (the /notation
 *  page). The engine plays the online rules from the standard start only, so such a game is refused, never reviewed by
 *  the wrong rules (design 18). */
export function variantProblem(record: GameRecord): string | null {
  const set = (tag: string) => { const v = record.tags[tag]?.trim(); return v && v !== "?" && v !== "-" ? v : null; };
  const rules = set("Rules"), position = set("Position");
  if (rules) return `This game is played by other rules (${rules}). Hedge School reviews games of the online rules only.`;
  if (position) return "This game starts from another position. Hedge School reviews games from the standard start only.";
  return null;
}

/** Imports a read record. Returns the game's id, or throws an Error whose message tells the player what is wrong. */
export async function importRecord(text: string, record: GameRecord): Promise<string> {
  const variant = variantProblem(record);
  if (variant) throw new Error(variant);
  const { problem, cuts } = await checkMoves(record);
  if (problem) throw new Error(problem);
  // The record is kept with a cut mark on every move that cuts, as the notation asks.
  const { id, kept } = await saveGame(cuts ? markCuts(text, record, cuts) : text, record);
  if (!kept) throw new Error("This browser does not let the site keep games (a private window, or blocked site data).");
  return id;
}
