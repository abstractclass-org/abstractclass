// The opening book's loader (design 32, items 5 and 11), behind one interface: `Book`. The explorer's parts read the
// book through it only, so that another form of the book (the engine repository's, request 22) can come in through an
// adapter that gives the same interface. `openBook` reads the site's own form (form.ts): the index first, then the
// parts as the lookups need them, the start's part first.
import { BOOK_FORMAT, BOOK_VERSION, type BookIndex, type BookPart, type BookPosition, type BookSource } from "./form.ts";
import { mirrorArea } from "./area.ts";
import { mirrorEdge, mirrorPosition } from "../engine/notation.ts";

/** Where the book holds a position: the notation that it stores, its part, and whether the stored position is the
 *  mirror image of the position looked up. */
export interface BookPlace { stored: string; part: number; mirrored: boolean }
/** A book position that a lookup found, as the book stores it, and whether it is the mirror image of the position
 *  looked up (`asReached` turns it around). */
export interface BookFound { position: BookPosition; mirrored: boolean }

export interface Book {
  readonly source: BookSource;
  /** The start, in the position notation. */
  readonly start: string;
  /** Where the book holds a position or its mirror image, from the index alone. Null when it holds neither. */
  find(position: string): BookPlace | null;
  /** The book's position, with its part loaded. Null when the book does not hold it. It rejects with a
   *  BookLoadError when the part does not load, and a later call tries again. */
  get(position: string): Promise<BookFound | null>;
  /** The book's position at once: null when the book does not hold it, undefined while its part is not loaded. */
  peek(position: string): BookFound | null | undefined;
}

/** A file of the book that did not load, or that is not a book's file. */
export class BookLoadError extends Error {
  readonly url: string;
  constructor(url: string, reason: unknown) {
    super(`the book's file ${url} did not load: ${reason instanceof Error ? reason.message : String(reason)}`);
    this.name = "BookLoadError";
    this.url = url;
  }
}

/** Reads a file of the book: its address in, its JSON out. */
export type BookReader = (url: string) => Promise<unknown>;

const fetchJson: BookReader = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
};

function checked<T extends { format: unknown; version: unknown }>(file: T): T {
  if (file?.format !== BOOK_FORMAT) throw new Error(`not a book's file: its format is ${String(file?.format)}`);
  if (file.version !== BOOK_VERSION) throw new Error(`the book's form ${String(file.version)} is not ${BOOK_VERSION}`);
  return file;
}

/** The book of the index at `url`, in the site's form. It loads the index, then starts the start's part. */
export async function openBook(url: string, read: BookReader = fetchJson): Promise<Book> {
  let index: BookIndex;
  try {
    index = checked((await read(url)) as BookIndex);
  } catch (e) {
    throw new BookLoadError(url, e);
  }
  const book = new FileBook(index, url.slice(0, url.lastIndexOf("/") + 1), read);
  book.get(index.start).catch(() => {}); // the start's part first. Its failure comes again at the explorer's lookup.
  return book;
}

class FileBook implements Book {
  readonly source: BookSource;
  readonly start: string;
  private readonly index: BookIndex;
  private readonly base: string;
  private readonly read: BookReader;
  private readonly where = new Map<string, number>();
  private readonly loading: (Promise<Map<string, BookPosition>> | undefined)[] = [];
  private readonly loaded: (Map<string, BookPosition> | undefined)[] = [];

  constructor(index: BookIndex, base: string, read: BookReader) {
    this.index = index;
    this.base = base;
    this.read = read;
    this.source = index.source;
    this.start = index.start;
    index.parts.forEach((part, i) => part.positions.forEach(p => this.where.set(p, i)));
  }

  find(position: string): BookPlace | null {
    const part = this.where.get(position);
    if (part !== undefined) return { stored: position, part, mirrored: false };
    const image = mirrorPosition(position), imagePart = this.where.get(image);
    return imagePart === undefined ? null : { stored: image, part: imagePart, mirrored: true };
  }

  async get(position: string): Promise<BookFound | null> {
    const place = this.find(position);
    if (!place) return null;
    return this.found(place, await this.part(place.part));
  }

  peek(position: string): BookFound | null | undefined {
    const place = this.find(position);
    if (!place) return null;
    const part = this.loaded[place.part];
    return part && this.found(place, part);
  }

  private found(place: BookPlace, part: Map<string, BookPosition>): BookFound {
    const position = part.get(place.stored);
    if (!position) throw new BookLoadError(this.url(place.part), `it lacks the position ${place.stored}`);
    return { position, mirrored: place.mirrored };
  }

  private url = (part: number) => this.base + this.index.parts[part].file;

  private part(i: number): Promise<Map<string, BookPosition>> {
    const url = this.url(i);
    return this.loading[i] ??= this.read(url).then(
      file => {
        const part = new Map(checked(file as BookPart).positions.map(p => [p.position, p]));
        this.loaded[i] = part;
        return part;
      },
      e => {
        this.loading[i] = undefined; // a later lookup tries again ("Try again", design 32)
        throw new BookLoadError(url, e);
      });
  }
}

/** A found position as the player reached it: the stored position when it is not mirrored, else its mirror image,
 *  with its moves, its outside move, its refutations and its area map mirrored. A move's `to` stays the notation that
 *  the book stores, so its `mirrored` turns over. The parents stay as the book stores them. */
export function asReached({ position: p, mirrored }: BookFound): BookPosition {
  if (!mirrored) return p;
  return {
    ...p,
    position: mirrorPosition(p.position),
    moves: p.moves.map(({ mirrored: storedMirrored, ...m }) => ({
      ...m,
      move: mirrorEdge(m.move),
      ...(storedMirrored ? {} : { mirrored: true as const }),
      ...(m.trap ? { trap: { ...m.trap, refutation: m.trap.refutation.map(mirrorEdge) } } : {}),
    })),
    outside: p.outside && { ...p.outside, move: mirrorEdge(p.outside.move) },
    area: mirrorArea(p.area),
  };
}
