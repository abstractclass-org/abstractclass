// The board's variants, for the owner to compare on the lab page (/lab/board?first=…&cand=…): the mark of each
// blueprint's first cell in the hands, and the look of the engine's candidates. Once one of each is chosen, the others
// come out of the board.

/** The mark of a blueprint's first cell (0, 0):
 *  - "ring": a ring inside the cell's edge, of one width all round.
 *  - "fill": the cell's fill darker (lighter on the dark theme).
 *  - "outline": a thick line round the blueprint's shape, and a dot on its first cell's top corner. The first cell is
 *    the top row's left cell, so its top corner is always on the outline.
 *  - "pointer": a small triangle above the first cell, which points down at it. Nothing of the blueprint is above its
 *    first cell, so the triangle never covers a cell. */
export type FirstMark = "ring" | "fill" | "outline" | "pointer";
export const FIRST_MARKS: readonly FirstMark[] = ["ring", "fill", "outline", "pointer"];

/** The look of the candidates:
 *  - `footprint`: each placement's hexes, none (the rank on its first cell's hex only), their outline, or their cells
 *    faded in the mover's colour. With a footprint, the rank goes on the footprint's middle hex.
 *  - `number`: the blueprint's number beside the rank, in a box in the mover's colour, as the hands number them.
 *  - `hand`: in the hands, a chip with the rank on each blueprint that a placement places, and an edit's rank on the
 *    cell that it moves, with its arrow and its target always drawn. */
export interface CandidateLook { footprint: "none" | "outline" | "ghost"; number: boolean; hand: boolean }
export const CANDIDATE_LOOKS = {
  badge: { footprint: "none", number: false, hand: false },
  outline: { footprint: "outline", number: false, hand: false },
  ghost: { footprint: "ghost", number: false, hand: false },
  label: { footprint: "none", number: true, hand: false },
  chips: { footprint: "none", number: false, hand: true },
  mix: { footprint: "outline", number: true, hand: true },
} as const satisfies Record<string, CandidateLook>;
export type CandidateLookName = keyof typeof CANDIDATE_LOOKS;

export interface BoardVariant { first: FirstMark; candidates: CandidateLook }
export const DEFAULT_VARIANT: BoardVariant = { first: "ring", candidates: CANDIDATE_LOOKS.badge };
