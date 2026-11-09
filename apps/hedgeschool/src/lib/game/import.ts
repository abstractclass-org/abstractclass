// A game record into the player's games: checked with the engine's rules (check.ts), given its cut marks, and kept in
// this browser (store.ts). The pages that import (Home, and the review's ways in, Arrival.svelte) show the outcome.
import { setUpRefusal } from "@abstractclass/record/record.ts";
import { setUpStart } from "#lib/engine/notation.ts";
import { checkMoves } from "./check.ts";
import { markCuts, type GameRecord } from "./record.ts";
import { saveGame } from "./store.ts";

/** The pages that refuse a game of other rules, each in its own words (design 21, design 24). */
export type RulesPage = "review" | "analysis" | "practice";
const onlineRulesOnly: Record<RulesPage, string> = {
  review: "Hedge School reviews games of the online rules only.",
  analysis: "The Analysis board shows games of the online rules only.",
  practice: "Practice plays games of the online rules only.",
};

/** Why a page cannot take a game of another variant, or from another start, or null. The review refuses both. The
 *  Analysis board and Practice take another start (design 21, design 24), and refuse other rules in their own words.
 *  The notation names them with the `Rules` and `Position` tags, which a game of the online rules from the standard
 *  start leaves out (the /notation page). The engine plays the online rules only, so such a game is refused, never
 *  reviewed or played by the wrong rules (design 18). */
export function variantProblem(record: GameRecord, page: RulesPage = "review"): string | null {
  const rules = otherRules(record);
  if (rules) return `This game uses other rules (${rules}). ${onlineRulesOnly[page]}`;
  return page === "review" && setUpStart(record.tags.Position) ? setUpRefusal("Hedge School") : null;
}

/** The rules that a game's `Rules` tag names, or null for the online rules: no tag, or "?" or "-". */
function otherRules(record: GameRecord): string | null {
  const rules = record.tags.Rules?.trim();
  return rules && rules !== "?" && rules !== "-" ? rules : null;
}

/** Why each of the arrival's two ways (ToolChoice.svelte, design 21) refuses a tool's game before its click, or null
 *  for a way that takes the game. Each way's reason is the one that its page gives after the click. */
export function wayRefusals(record: GameRecord): { review: string | null; analyze: string | null } {
  return { review: variantProblem(record), analyze: variantProblem(record, "analysis") };
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
