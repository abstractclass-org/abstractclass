// What a move that the player asked to evaluate says while it has no label (design 07, item 11). "Evaluating…" and the
// pulsing "…" show only while a search for the move can run or runs. Where none can, the move says "Not analyzed yet",
// as the game's moves do, with the reason and what the player can do.

/** The engine's state, as far as a search for a move depends on it. */
export interface SearchState {
  /** A review snapshot (design 20): it searches nothing. */
  snapshot: boolean;
  /** The engine is off (its switch, and so its pause): no search starts. */
  off: boolean;
  /** The engine's error, or empty. */
  error: string;
}

/** Why no search for a move can run now, or null when one can run or runs. The states where one can: the engine on, with
 *  its network loaded or still loading (a search then starts when it is loaded), and a search under way. */
export function noSearchReason({ snapshot, off, error }: SearchState): string | null {
  if (snapshot) return "A review snapshot does no searches.";
  if (error) return "The engine has an error.";
  if (off) return "The engine is off. Turn it on to evaluate this move.";
  return null;
}

/** A judged move's text while it has no label: "Evaluating…" while a search can run, else "Not analyzed yet." and the
 *  reason. */
export function unlabeledText(reason: string | null): string {
  return reason === null ? "Evaluating…" : `Not analyzed yet. ${reason}`;
}
