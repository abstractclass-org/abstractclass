// What a move that the player asked to evaluate says while it has no label (design 07, item 11). "Evaluating…" and the
// pulsing "…" show only while a search for the move can run or runs. Where none can, the move says "Not analyzed yet",
// as the game's moves do, with the reason and what the player can do.

/** The text of a move with no label where no search for it runs: the game's moves say it too. */
export const NOT_ANALYZED = "Not analyzed yet";

/** The engine's state, as far as a search for a move depends on it: the view gives the analysis's own fields. */
export interface SearchState {
  /** A review snapshot (design 20): it searches nothing. */
  snapshot: boolean;
  /** The analysis is paused (`GameAnalysis.paused`): the session pauses it while the engine's switch is off, and
   *  then no search starts. */
  paused: boolean;
  /** The engine's error (`GameAnalysis.error`), or empty. */
  error: string;
}

/** Why no search for a move can run now, or null when one can run or runs. The states where one can: the engine on,
 *  with its network loaded or still loading (a search then starts when it is loaded), and a search under way. */
export function noSearchReason({ snapshot, paused, error }: SearchState): string | null {
  if (snapshot) return "A review snapshot does no searches.";
  if (error) return "The engine has an error.";
  if (paused) return "The engine is off. To evaluate this move, set the engine switch to on.";
  return null;
}

/** A judged move's text while it has no label: "Evaluating…" while a search can run, else "Not analyzed yet." and
 *  the reason. */
export function unlabeledText(reason: string | null): string {
  return reason === null ? "Evaluating…" : `${NOT_ANALYZED}. ${reason}`;
}
