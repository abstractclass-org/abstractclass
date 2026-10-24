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

export class OpeningBook {
  #book = $state.raw<Book | null>(null);
  #error = $state.raw<BookLoadError | null>(null); // the index's
  #failed = new Map<string, BookLoadError>(); // the positions whose part did not load, until `retry`
  #asked = new Set<string>(); // the positions whose part loads
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
    if (!book) return this.#error ? { state: "failed", error: this.#error } : { state: "loading" };
    const error = this.#failed.get(position);
    if (error) return { state: "failed", error };
    const p = book.peek(position);
    if (p === null) return { state: "out" };
    if (p) return { state: "in", position: p };
    if (!this.#asked.has(position)) {
      this.#asked.add(position);
      book.get(position).then(() => {}, e => this.#failed.set(position, e instanceof BookLoadError ? e : new BookLoadError(this.#url, e)))
        .finally(() => { this.#asked.delete(position); this.#changed++; });
    }
    return { state: "loading" };
  }

  /** "Try again": the index again when it did not load, and each part that did not load at the next lookup. */
  retry() {
    this.#failed.clear();
    if (!this.#book) this.#open();
    this.#changed++;
  }
}
