// Puzzles from the mock game, by Lichess's generator rule (lichess-puzzler generator.py): the solution must be the
// only good move. Here: the engine's first choice is at least ONLY_EDGE_GAP better than its second (model.ts's Great).
// Lichess starts a puzzle right after the opponent's mistake. Positions that follow one come first.
//
// Placeholders: the difficulty is predicted from the gap and the game phase, not rated from solvers' attempts
// (design 01, principle 7). Themes are only what needs no rules: the phase by edge number (design 01, principle 8)
// and "Only edge". Motif tags (enclose, cut, double threat) need the engine's rules.
import { BAD_LABELS, moverWin, onlyEdge, type Edge, type Player, type Review } from "#lib/review/model.ts";

export type Theme = "opening" | "middlegame" | "endgame" | "onlyEdge" | "afterMistake";
export const THEME_TEXT: Record<Theme, { name: string; about: string }> = {
  opening: { name: "Opening", about: "The first 16 edges." },
  middlegame: { name: "Middlegame", about: "Edges 17 to 80." },
  endgame: { name: "Endgame", about: "The last 40 edges." },
  onlyEdge: { name: "Only edge", about: "Every other edge loses at least 10% of win chance." },
  afterMistake: { name: "Punish the mistake", about: "The opponent's last edge was a mistake." },
};

export interface Puzzle {
  id: string;
  index: number; // the position in the game: the solver moves next
  player: Player;
  solution: Edge;
  gap: number; // how much better the solution is than the engine's second choice, in win chance
  rating: number; // predicted difficulty
  themes: Theme[];
}

export function puzzlesFrom(R: Review): Puzzle[] {
  const out: Puzzle[] = [];
  R.data.analysis.forEach((a, i) => {
    const player = R.data.positions[i].player as Player;
    if (!onlyEdge(a, player)) return;
    const [first, second] = a.candidates;
    const gap = moverWin(first.blueWin, player) - moverWin(second.blueWin, player);
    const prev = R.edges[i - 1];
    const afterMistake = !!prev && prev.player !== player && BAD_LABELS.includes(prev.label);
    const phase: Theme = i < 16 ? "opening" : i < 80 ? "middlegame" : "endgame";
    // A guess, to be replaced by ratings from solvers: smaller gaps and later phases read as harder.
    const rating = Math.round(1100 + 900 * Math.max(0, 0.35 - gap) / 0.25 + (phase === "endgame" ? 150 : phase === "middlegame" ? 80 : 0));
    out.push({
      id: `p${i}`, index: i, player, solution: first.edge, gap, rating,
      themes: [phase, "onlyEdge", ...(afterMistake ? ["afterMistake" as const] : [])],
    });
  });
  return out.sort((a, b) => Number(b.themes.includes("afterMistake")) - Number(a.themes.includes("afterMistake")) || a.rating - b.rating);
}

/** Elo's update for one rated attempt (a placeholder for Glicko-2, which Lichess uses). */
export const nextRating = (player: number, puzzle: number, solved: boolean, k = 32) =>
  Math.round(player + k * ((solved ? 1 : 0) - 1 / (1 + 10 ** ((puzzle - player) / 400))));
