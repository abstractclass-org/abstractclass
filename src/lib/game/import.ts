// A game record into the player's games: checked with the engine's rules (check.ts), given its cut marks, and kept in
// this browser (store.ts). The pages that import (Home, and /import from the bookmarklet) show the outcome.
import { checkMoves } from "./check.ts";
import { markCuts, type GameRecord } from "./record.ts";
import { saveGame } from "./store.ts";

/** Imports a read record. Returns the game's id, or throws an Error whose message tells the player what is wrong. */
export async function importRecord(text: string, record: GameRecord): Promise<string> {
  const { problem, cuts } = await checkMoves(record);
  if (problem) throw new Error(problem);
  // The record is kept with a cut mark on every move that cuts, as the notation asks.
  const { id, kept } = await saveGame(cuts ? markCuts(text, record, cuts) : text, record);
  if (!kept) throw new Error("This browser does not let the site keep games (a private window, or blocked site data).");
  return id;
}
