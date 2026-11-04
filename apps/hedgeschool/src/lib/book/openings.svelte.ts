// The book's place on Openings (design 32, item 5): the place of the review and the Analysis board (place.svelte.ts),
// whose switch starts on "Book" at each visit, with what Openings adds to its table. The page sets them: the first
// view's box of the main line, the other move orders that reach the position on screen, and the way to go to a line.
// Its table is OpeningsBookTable.svelte.
import type { Unit } from "@abstractclass/analysis/model.ts";
import type { OpeningBook } from "./lookup.svelte.ts";
import { BookPlace, type PlaceOptions } from "./place.svelte.ts";
import type { LineTurn } from "./sentences.ts";
import type { LineLink } from "./tree.ts";

export class OpeningsPlace extends BookPlace {
  /** The first view's box: the main line, one turn a line with its sentence, once its parts have loaded. */
  turns = $state.raw<LineTurn[] | null>(null);
  /** The other move orders that reach the position on screen (tree.ts, `alsoReached`): "Also reached by". */
  also = $state.raw<LineLink[]>([]);
  /** Goes to a line from the start, as the page does. */
  go: (path: string[]) => void = () => {};

  constructor(book: OpeningBook, notations: () => (string | undefined)[], unit: () => Unit, options?: PlaceOptions) {
    super(book, "openings", notations, unit, options);
  }
}
