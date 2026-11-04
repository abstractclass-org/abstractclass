// The book's place on Openings (design 32, item 5): the place of the review and the Analysis board (place.svelte.ts),
// whose switch starts on "Book" at each visit, with what Openings adds to its table: the other move orders that reach
// the position on screen, which the page sets, and the way to go to a line. Its table is OpeningsBookTable.svelte. It
// counts no feature and gives no "Study in Openings": the page counts its own features (design 17).
import type { Unit } from "@abstractclass/analysis/model.ts";
import type { OpeningBook } from "./lookup.svelte.ts";
import { BookPlace } from "./place.svelte.ts";
import type { LineLink } from "./tree.ts";

export class OpeningsPlace extends BookPlace {
  /** The other move orders that reach the position on screen (tree.ts, `alsoReached`): "Also reached by". */
  also = $state.raw<LineLink[]>([]);
  /** Goes to a line from the start, as the page's links do. */
  readonly go: (path: string[]) => void;

  constructor(book: OpeningBook, notations: () => (string | undefined)[], unit: () => Unit, go: (path: string[]) => void) {
    super(book, "openings", notations, unit);
    this.go = go;
  }
}
