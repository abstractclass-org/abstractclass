// The opening book where the review and the Analysis board show it (design 32, items 3 and 8): the book's table in the
// candidates' place in the analysis column, off until the player turns it on. Each page keeps its own choice of
// "Book" or "Candidates" in the browser. Outside the book the column shows the candidates as it does with no book, and
// the player's choice of "Book" comes back at the next book position. The page draws the table (BookTable.svelte) and
// the board from a BookPlace, and handles the key o (`toggle`). The rows follow the page's "Review by": by turn, at a
// turn's start, each row is a whole turn (rows.ts, `turnRows`), from the book's positions after each book move there.
//
// The site serves the test book until the engine repository's book comes (beads abscls-tpaj.13). The dev and preview
// servers serve it, and no build holds it (vite.config.ts, `testBook`): where its index does not load, the analysis
// column stays as it was, with no switch (`ready`).
import type { Unit } from "@abstractclass/analysis/model.ts";
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import { parseEdge } from "#lib/engine/notation.ts";
import { OpeningBook, OUT, type BookAt } from "./lookup.svelte.ts";
import { bookRows, rowCandidates, rowLine, turnRows, turnStart, type BookRow } from "./rows.ts";

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
export interface BookChoice { show: "book" | "candidates" }
const keyOf = (page: BookPage) => `hedge-school:book-table:${page}:1`;

/** The page's kept choice: "Candidates" by default (design 32, item 3). */
export function keptChoice(page: BookPage): BookChoice {
  const kept = readLocalJson<Partial<BookChoice>>(keyOf(page));
  return { show: kept?.show === "book" ? "book" : "candidates" };
}
export const keepChoice = (page: BookPage, choice: BookChoice) => writeLocal(keyOf(page), JSON.stringify(choice));

export class BookPlace {
  readonly book: OpeningBook;
  readonly #page: BookPage;
  // The page's sources, set by the constructor: the $derived values below read them when they first run. The values
  // here only let TypeScript see the fields set before those values' initializers.
  #path: () => (string | undefined)[] = () => [];
  #unit: () => Unit = () => "edge";
  #show = $state<BookChoice["show"]>("candidates");
  /** The row pointed at, by its name (rows.ts, BookRow `move`), in the table or by its number on the board: its row is
   *  lit, and the board draws its line. */
  pointed = $state<string | null>(null);
  #more = $state<string | undefined>(undefined); // the position where the player opened "Show more"

  /** `path`: the notation of each position from the start to the position on screen (undefined where a position has
   *  none). `unit`: the page's "Review by", which the rows follow. */
  constructor(book: OpeningBook, page: BookPage, path: () => (string | undefined)[], unit: () => Unit = () => "edge") {
    this.book = book;
    this.#page = page;
    this.#path = path;
    this.#unit = unit;
    this.#show = keptChoice(page).show;
  }

  /** The book's index has loaded: the table and its switch show. */
  get ready(): boolean { return !!this.book.book; }

  /** The player's choice, which the browser keeps. Outside the book, the table shows the candidates whatever it is. */
  get show() { return this.#show; }
  set show(v: BookChoice["show"]) { this.#show = v; keepChoice(this.#page, { show: v }); }
  /** "Book" for this page only: the review's Report rows and its mark turn the book on for the review on screen (design
   *  32, item 4). Only the switch and the key o change the choice that the browser keeps. */
  showForNow() { this.#show = "book"; }

  #atOf = (notation: string | undefined): BookAt => (notation === undefined ? OUT : this.book.at(notation));
  readonly #here = $derived(this.#atOf(this.#path().at(-1)));
  /** By turn at a turn's start: the book at the position after each book move there, which the whole turns need. */
  readonly #seconds = $derived.by((): BookAt[] | null => {
    const here = this.#here;
    return here.state === "in" && this.#unit() === "turn" && turnStart(here.position)
      ? here.position.moves.map(m => this.book.at(m.to)) : null;
  });
  /** The rows are whole turns. */
  readonly byTurn = $derived(!!this.#seconds);
  /** The book at the position on screen. By turn at a turn's start, it loads or fails while a position after a book
   *  move there does. */
  readonly at = $derived(this.#seconds?.find(a => a.state === "loading" || a.state === "failed") ?? this.#here);
  /** The table's rows at a book position (rows.ts), for the table and the board's numbers. */
  readonly rows = $derived.by<BookRow[]>(() => {
    if (this.at.state !== "in") return [];
    const seconds = this.#seconds;
    return seconds ? turnRows(this.at.position, seconds.map(a => (a.state === "in" ? a.position : null)))
      : bookRows(this.at.position);
  });
  /** By turn, the player opened "Show more" at this position: the table and the board show every book turn. The next
   *  position shows the best turns only again. */
  get more(): boolean { return this.#more !== undefined && this.#more === this.#path().at(-1); }
  set more(v: boolean) { this.#more = v ? this.#path().at(-1) : undefined; }
  /** The rows that the table and the board show: the rows after "Show more" only once the player opens it. */
  readonly shown = $derived(this.more ? this.rows : this.rows.filter(r => !r.more));
  /** The table shows the book: its index has loaded, the player chose "Book", and the position is not outside the
   *  book. Its part can still load, or have failed: then it has no rows, and the board no numbers. */
  readonly showsBook = $derived(this.ready && this.at.state !== "out" && this.#show === "book");
  /** The board's numbers for the rows (rows.ts, rowCandidates), shown while the table shows the book, as the review's
   *  view gives them to its board (@abstractclass/review/game.ts, ViewBook). */
  readonly numbers = $derived(rowCandidates(this.shown).map(c => ({ move: c.edge, rank: c.rank, note: c.note })));
  /** The first edge of the row pointed at: the board lights its number. */
  get numbered(): string | null { return this.rows.find(r => r.move === this.pointed)?.edges[0] ?? null; }
  /** The board's number on an edge pointed at: its row, the first row that starts with the edge. */
  point(edge: string | null) { this.pointed = edge === null ? null : this.#rowAt(edge)?.move ?? null; }
  /** The edges that a click on the board's number on an edge plays: its row's. */
  movesAt(edge: string): string[] { return this.#rowAt(edge)?.edges ?? [edge]; }
  #rowAt = (edge: string) => this.shown.find(r => r.edges[0] === edge);
  /** The line of the row pointed at while the table shows the book, as the board draws it: its edges, then the book's
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
