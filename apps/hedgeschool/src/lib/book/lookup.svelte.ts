// The opening book as a page reads it (design 32, item 11): the book's state at the position on screen, which a page
// reads in a $derived and which changes when a part loads or fails. The book loads in parts (book.ts): a position
// whose part still loads is "loading", and a part that did not load is "failed" until "Try again" (`retry`). The pages
// work while the book loads or fails: the state only tells the table what to show.
import { BookLoadError, openBook, type Book, type BookReader } from "./book.ts";
import type { BookPosition, BookSource } from "./form.ts";

/** The book at a position: its part still loads, a file did not load, the book does not hold it, or the position. */
export type BookAt =
  | { state: "loading" }
  | { state: "failed"; error: BookLoadError }
  | { state: "out" }
  | { state: "in"; position: BookPosition };
/** The states that hold nothing more, one object each, so that a page's $derived value stops at a lookup that gives the
 *  same state again. */
export const LOADING: BookAt = { state: "loading" }, OUT: BookAt = { state: "out" };

export class OpeningBook {
  #book = $state.raw<Book | null>(null);
  #error = $state.raw<BookLoadError | null>(null); // the index's
  #failed = new Map<string, BookLoadError>(); // the positions whose part did not load, until `retry`
  #asked = new Set<string>(); // the positions whose part loads
  // Each position in the book or out of it, as `at` first gave it: the index and a loaded part do not change, and the
  // same object stops the pages' $derived values at a load that does not change the position on screen
  #known = new Map<string, BookAt>();
  #changed = $state(0); // counts the loads and failures, so that `at` runs again
  readonly #url: string;
  readonly #read: BookReader | undefined;

  /** The book of the index at `url` (book.ts, openBook): it starts to load at once. */
  constructor(url: string, read?: BookReader) {
    this.#url = url;
    this.#read = read;
    this.#open();
  }

  #open() {
    this.#error = null;
    openBook(this.#url, this.#read).then(b => (this.#book = b),
      e => (this.#error = e instanceof BookLoadError ? e : new BookLoadError(this.#url, e)));
  }

  /** The book once its index has loaded. */
  get book(): Book | null { return this.#book; }
  /** Where the book comes from (the title row's line), once its index has loaded. */
  get source(): BookSource | null { return this.#book?.source ?? null; }

  /** The book at a position, as the player reached it. It starts the load of the position's part when it needs one. */
  at(position: string): BookAt {
    void this.#changed;
    const book = this.#book;
    if (!book) return this.#error ? { state: "failed", error: this.#error } : LOADING;
    const error = this.#failed.get(position);
    if (error) return { state: "failed", error };
    const known = this.#known.get(position);
    if (known) return known;
    const p = book.peek(position);
    if (p !== undefined) {
      const a: BookAt = p ? { state: "in", position: p } : OUT;
      this.#known.set(position, a);
      return a;
    }
    if (!this.#asked.has(position)) {
      this.#asked.add(position);
      book.get(position).then(() => {}, e => this.#failed.set(position, e instanceof BookLoadError ? e : new BookLoadError(this.#url, e)))
        .finally(() => { this.#asked.delete(position); this.#changed++; });
    }
    return LOADING;
  }

  /** "Try again": the index again when it did not load, and each part that did not load at the next lookup. */
  retry() {
    this.#failed.clear();
    if (!this.#book) this.#open();
    this.#changed++;
  }
}
