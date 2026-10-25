// The opening book where the review and the Analysis board show it (design 32, items 3 and 8): the book's table in the
// candidates' place in the analysis column, off until the player turns it on. Each page keeps its own choice of
// "Book" or "Candidates" and of "Show the values" in the browser. Outside the book the table shows the candidates, and
// the player's choice of "Book" comes back at the next book position. The page draws the table (BookTable.svelte) and
// the board from a BookPlace, and handles the key o (`toggle`).
//
// The site serves the test book until the engine repository's book comes (beads abscls-tpaj.13). The dev and preview
// servers serve it, and no build holds it (vite.config.ts, `testBook`): where its index does not load, the analysis
// column stays as it was, with no switch (`ready`).
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import { parseEdge } from "#lib/engine/notation.ts";
import { OpeningBook, OUT, type BookAt } from "./lookup.svelte.ts";
import { bookRows, rowCandidates, rowLine, type BookRow, type GameMove } from "./rows.ts";

/** The book's index: the test book's, until the engine's book comes. */
const BOOK_URL = "/test-book/prototype/index.json";
let shared: OpeningBook | null = null;
/** The site's book, one for every page of a visit, so that a part loads once. None in the build's prerender. */
export function siteBook(): OpeningBook | null {
  if (typeof window === "undefined") return null;
  return (shared ??= new OpeningBook(BOOK_URL));
}

/** The pages that show the book in their analysis column, each with its own kept choice. */
export type BookPage = "review" | "board";
export interface BookChoice { show: "book" | "candidates"; values: boolean }
const keyOf = (page: BookPage) => `hedge-school:book-table:${page}:1`;

/** The page's kept choice: "Candidates" and the values closed by default (design 32, item 3). */
export function keptChoice(page: BookPage): BookChoice {
  const kept = readLocalJson<Partial<BookChoice>>(keyOf(page));
  return { show: kept?.show === "book" ? "book" : "candidates", values: kept?.values === true };
}
export const keepChoice = (page: BookPage, choice: BookChoice) => writeLocal(keyOf(page), JSON.stringify(choice));

/** The place of the last book position on a path, looked for from the path's end: a position that the book's index
 *  lists, also while its part loads or after it failed. -1 when the path has none. `at`: the book at a place on the
 *  path. The search stops at that position, so it starts no part's load for the positions before it. */
export function lastInBook(length: number, at: (k: number) => BookAt): number {
  let k = length - 1;
  while (k >= 0 && at(k).state === "out") k--;
  return k;
}

export class BookPlace {
  readonly book: OpeningBook;
  readonly #page: BookPage;
  // The page's sources, set by the constructor: the $derived values below read them when they first run. The values
  // here only let TypeScript see the fields set before those values' initializers.
  #path: () => (string | undefined)[] = () => [];
  #game: () => GameMove | null = () => null;
  #show = $state<BookChoice["show"]>("candidates");
  #values = $state(false);
  /** The edge pointed at, in the table or by its number on the board: its row is lit, and the board draws its line. */
  pointed = $state<string | null>(null);

  /** `path`: the notation of each position from the start to the position on screen (undefined where a position has
   *  none). `game`: the game's move at the position on screen, in the review (rows.ts, GameMove). */
  constructor(book: OpeningBook, page: BookPage, path: () => (string | undefined)[], game: () => GameMove | null) {
    this.book = book;
    this.#page = page;
    this.#path = path;
    this.#game = game;
    ({ show: this.#show, values: this.#values } = keptChoice(page));
  }

  /** The book's index has loaded: the table and its switch show. */
  get ready(): boolean { return !!this.book.book; }

  /** The player's choice, which the browser keeps. Outside the book, the table shows the candidates whatever it is. */
  get show() { return this.#show; }
  set show(v: BookChoice["show"]) { this.#show = v; this.#keep(); }
  /** "Show the values" (design 32, item 3), kept too. */
  get values() { return this.#values; }
  set values(v: boolean) { this.#values = v; this.#keep(); }
  #keep() { keepChoice(this.#page, { show: this.#show, values: this.#values }); }
  /** "Book" for this page only: the review's Report rows and its mark turn the book on for the review on screen (design
   *  32, item 4). Only the switch and the key o change the choice that the browser keeps. */
  showForNow() { this.#show = "book"; }

  #atOf = (notation: string | undefined): BookAt => (notation === undefined ? OUT : this.book.at(notation));
  /** The book at the position on screen. */
  readonly at = $derived(this.#atOf(this.#path().at(-1)));
  /** The table's rows at a book position (rows.ts), for the table and the board's numbers. */
  readonly rows = $derived<BookRow[]>(this.at.state === "in" ? bookRows(this.at.position, this.#game()) : []);
  /** The table shows the book: its index has loaded, the player chose "Book", and the position is not outside the
   *  book. Its part can still load, or have failed: then it has no rows, and the board no numbers. */
  readonly showsBook = $derived(this.ready && this.at.state !== "out" && this.#show === "book");
  /** The place on the path of its last book position (the line outside the book, item 8), or -1. */
  readonly last = $derived.by(() => {
    const path = this.#path();
    return lastInBook(path.length, k => this.#atOf(path[k]));
  });
  /** The board's numbers for the rows (rows.ts, rowCandidates), shown while the table shows the book, as the review's
   *  view gives them to its board (@abstractclass/review/game.ts, ViewBook). */
  readonly numbers = $derived(rowCandidates(this.rows).map(c => ({ move: c.edge, rank: c.rank, note: c.note })));
  /** The line of the row pointed at while the table shows the book, as the board draws it: its edge, then the book's
   *  main line or a trap's refutation (rows.ts, rowLine). */
  readonly line = $derived.by(() => {
    const row = this.showsBook ? this.rows.find(r => r.move === this.pointed) : undefined, book = this.book.book;
    return row && book ? rowLine(book, row).map(parseEdge) : null;
  });

  /** The key o: "Book" or "Candidates". Outside the book "Book" is unavailable, so the key does nothing there. */
  toggle() {
    if (this.at.state !== "out") this.show = this.#show === "book" ? "candidates" : "book";
  }
}
