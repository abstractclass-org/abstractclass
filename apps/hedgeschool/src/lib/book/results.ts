// The book's values as the review's results (design 32, "The review", "A book position's values"): at each of the
// game's positions that the book holds, the review takes the book's values in place of the engine's search
// (@abstractclass/analysis/analysis.svelte.ts, GameAnalysis.useBook), so that a book move has one quality label and one
// loss on the page, the book's. The review's own rules (design 10) then judge the moves from these values, as from a
// search.
//
// What the book's fields replace in a search's result (@abstractclass/analysis/model.ts, Analysis):
// - `value`: the position's win chance and lead (`blueWin`, `lead`). By the book's minimax, it is the best of the first
//   book move's and the best move outside the book's, so a book move's loss is the book's (sentences.ts, `moveLoss`).
// - `moves` and `outside`: the candidates, the best for the mover first, each with the win chance and the lead after
//   it. The first is the engine's first choice, which a Best needs. The first book move's line goes on with the best
//   move after it (the first book move there, or the best move outside the book when that is better), which a Best by
//   turn needs.
// - `complexity`: the position's complexity (design 14).
// - `area`: the area map (design 30).
// - The book's source: the visits of its deep search, as the result's visits.
// The book has no candidate's visits, prior, margin or score spread: the review needs none of them for its labels.
import type { Analysis, Candidate } from "@abstractclass/analysis/model.ts";
import { moverWin } from "@abstractclass/analysis/model.ts";
import { mirrorEdge, mirrorPosition, parseEdge, type Edge } from "#lib/engine/notation.ts";
import { playerOf } from "#lib/engine/position.ts";
import { decodeArea } from "./area.ts";
import { BookLoadError, type Book } from "./book.ts";
import type { BookPosition } from "./form.ts";

/** A book position as the review's result (Analysis `book`). `visits`: the visits of the book's deep search (its
 *  source). `next`: the book's position after the first book move, for that move's line, or null. In a position that
 *  is its own mirror image (the start), each edge's mirror image follows it as its twin, as the engine lists twins. */
export function bookAnalysis(p: BookPosition, visits: number, next: BookPosition | null): Analysis<Edge> {
  const mover = playerOf(p.mover), win = (blueWin: number) => moverWin(blueWin, mover);
  const twins = mirrorPosition(p.position) === p.position;
  const candidate = (move: string, blueWin: number, lead: number | undefined, line: string[]): Candidate<Edge>[] => {
    const c: Candidate<Edge> = { edge: parseEdge(move), visits: 0, blueWin, ...(lead !== undefined ? { lead } : {}),
                                 line: line.map(parseEdge) };
    const image = mirrorEdge(move);
    return twins && image !== move
      ? [c, { ...c, edge: parseEdge(image), line: line.map(e => parseEdge(mirrorEdge(e))), twinOf: c.edge }] : [c];
  };
  const after = next && bestMove(next);
  const moves = p.moves.map((m, k) => candidate(m.move, m.value.blueWin, m.value.lead, k === 0 && after ? [m.move, after] : [m.move]));
  // The best move outside the book, in its place by the mover's win chance: before the first book move that is worse
  const out = p.outside && candidate(p.outside.move, p.outside.blueWin, undefined, [p.outside.move]);
  const at = out ? p.moves.findIndex(m => win(m.value.blueWin) < win(p.outside!.blueWin)) : -1;
  if (out) moves.splice(at < 0 ? moves.length : at, 0, out);
  return {
    blueWin: p.value.blueWin, visits, lead: p.value.lead, candidates: moves.flat(), ownership: decodeArea(p.area),
    complexity: p.complexity, book: true,
  };
}

/** The best move at a book position for its mover: the first book move, or the best move outside the book when that
 *  is better (sentences.ts, `bestWin`). Null where the position has neither. */
function bestMove(p: BookPosition): string | null {
  const win = (blueWin: number) => moverWin(blueWin, playerOf(p.mover)), first = p.moves[0];
  if (p.outside && (!first || win(p.outside.blueWin) > win(first.value.blueWin))) return p.outside.move;
  return first?.move ?? null;
}

/** The book's values of a game's positions, by index, as the review takes them (`bookAnalysis`). `notations[i]`:
 *  position i in the notation, undefined where it has none. Undefined where the book does not hold a position, and
 *  where its part did not load: the review searches those positions. */
export async function bookResults(book: Book, notations: (string | undefined)[]): Promise<(Analysis<Edge> | undefined)[]> {
  const get = (n: string) => book.get(n).catch(e => {
    if (e instanceof BookLoadError) return null;
    throw e;
  });
  return Promise.all(notations.map(async n => {
    const p = n === undefined ? null : await get(n);
    if (!p) return undefined;
    return bookAnalysis(p, book.source.visits, p.moves[0] ? await get(p.moves[0].to) : null);
  }));
}
