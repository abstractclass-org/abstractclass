// The opening book's loader (design 32, items 5 and 11), behind one interface: `Book`. The explorer's parts read the
// book through it only, so that another form of the book (the engine repository's, request 22) can come in through an
// adapter that gives the same interface. `openBook` reads the site's own form (form.ts): the index first, then the
// parts as the lookups need them, the start's part first.
import { BOOK_FORMAT, BOOK_VERSION, type BookIndex, type BookMove, type BookPart, type BookPosition,
  type BookSource } from "./form.ts";
import { mirrorArea } from "./area.ts";
import { mirrorEdge, mirrorPosition } from "#lib/engine/notation.ts";

/** The book. A lookup takes a position as the player reached it, and finds it or its mirror image, whichever the book
 *  stores. It gives the position as the player reached it (design 32, "Mirror images"): every position and edge in the
 *  player's orientation, so that a move's `to` and a parent's `position` are the positions that the player reaches,
 *  and no `mirrored` stays. */
export interface Book {
  readonly source: BookSource;
  /** The start, in the position notation. */
  readonly start: string;
  /** The book's position, with its part loaded. Null when the book does not hold it. It rejects with a
   *  BookLoadError when the part does not load, is not a book's part of this form, or does not answer in its time
   *  limit (BOOK_TIME_LIMIT), and a later call tries again. It always settles: the review's evaluation waits for it
   *  before it searches. */
  get(position: string): Promise<BookPosition | null>;
  /** The book's position at once: null when the book does not hold it (from the index alone), undefined while its
   *  part is not loaded. */
  peek(position: string): BookPosition | null | undefined;
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

/** How long a file of the book may take to load, from its request to the end of its body, in milliseconds. Past it, the
 *  loader stops the read and the file counts as not loaded, as a file that fails: a part's lookups fail and the review
 *  searches its positions, and the index fails as an index that does not load (design 32, "A file that does not
 *  answer"). The browser itself does not stop a fetch that stalls. 30 seconds is about 2.7 times the time of all the
 *  test book's files at once on DevTools' "3G". */
export const BOOK_TIME_LIMIT = 30_000;

/** Reads a file of the book: its address in, its JSON out. `signal` aborts when the time limit ends: a reader that
 *  fetches stops its request then. */
export type BookReader = (url: string, signal: AbortSignal) => Promise<unknown>;

const fetchJson: BookReader = async (url, signal) => {
  const response = await fetch(url, { signal }); // the signal stops the body's read too
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
};

/** A reader held to the time limit (inTime). */
type TimedReader = (url: string) => Promise<unknown>;

/** The time limit of a file of the book, in milliseconds: one for every file, or each file's by its address. */
export type BookLimit = number | ((url: string) => number);

/** `read` held to the time limit `limit`: past it, the read's signal aborts and the read rejects, whether the reader
 *  stops or not. */
function inTime(read: BookReader, limit: BookLimit): TimedReader {
  return url => new Promise((resolve, reject) => {
    const ms = typeof limit === "number" ? limit : limit(url);
    const abort = new AbortController();
    const reading = read(url, abort.signal); // a reader that throws at once rejects here, with no timer
    const timer = setTimeout(() => {
      const e = new Error(`no answer in ${ms / 1000} s`);
      abort.abort(e);
      reject(e);
    }, ms);
    reading.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

function checked<T extends { format: unknown; version: unknown }>(file: T): T {
  if (file?.format !== BOOK_FORMAT) throw new Error(`not a book's file: its format is ${String(file?.format)}`);
  if (file.version !== BOOK_VERSION) throw new Error(`the book's form ${String(file.version)} is not ${BOOK_VERSION}`);
  return file;
}

/** The book of the index at `url`, in the site's form. It loads the index, then starts the start's part. Each file
 *  that does not load within its time limit `limit` counts as not loaded (BOOK_TIME_LIMIT). A test gives a short
 *  limit to the files that must not answer only: a file that answers can take longer on a busy machine. */
export async function openBook(url: string, reader: BookReader = fetchJson,
                               limit: BookLimit = BOOK_TIME_LIMIT): Promise<Book> {
  const read = inTime(reader, limit);
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

type Part = Map<string, BookPosition>;
/** Where the book stores a position: the notation that it stores, its part, and whether the stored position is the
 *  mirror image of the position looked up. */
interface Place { stored: string; part: number; mirrored: boolean }

class FileBook implements Book {
  readonly source: BookSource;
  readonly start: string;
  private readonly urls: string[];
  private readonly read: TimedReader;
  private readonly where = new Map<string, number>(); // each stored position's part
  // Each part while it loads, then when it is loaded. A part that did not load, or not in the time limit, has
  // neither, so a later lookup tries again ("Try again", design 32).
  private readonly parts: (Promise<Part> | Part | undefined)[] = [];

  constructor(index: BookIndex, base: string, read: TimedReader) {
    this.source = index.source;
    this.start = index.start;
    this.urls = index.parts.map(p => base + p.file);
    this.read = read;
    index.parts.forEach((part, i) => part.positions.forEach(p => this.where.set(p, i)));
  }

  async get(position: string): Promise<BookPosition | null> {
    const place = this.place(position);
    return place && this.found(place, await (this.parts[place.part] ??= this.load(place.part)));
  }

  peek(position: string): BookPosition | null | undefined {
    const place = this.place(position), part = place && this.parts[place.part];
    return place && (part instanceof Map ? this.found(place, part) : undefined);
  }

  private place(position: string): Place | null {
    const part = this.where.get(position);
    if (part !== undefined) return { stored: position, part, mirrored: false };
    const image = mirrorPosition(position), imagePart = this.where.get(image);
    return imagePart === undefined ? null : { stored: image, part: imagePart, mirrored: true };
  }

  private found({ stored, part, mirrored }: Place, positions: Part): BookPosition {
    const position = positions.get(stored);
    if (!position) throw new BookLoadError(this.urls[part], `it lacks the position ${stored}`);
    return reached(position, mirrored);
  }

  /** Loads part `i`. A part that is not a book's, or of another form, fails as a part that does not load. */
  private load(i: number): Promise<Part> {
    const url = this.urls[i];
    return this.read(url).then(file => new Map(checked(file as BookPart).positions.map(p => [p.position, p]))).then(
      part => (this.parts[i] = part),
      e => {
        this.parts[i] = undefined;
        throw new BookLoadError(url, e);
      });
  }
}

/** The book move that an edge plays from a position as a lookup gives it. A position that is its own mirror image (the
 *  start) lists one edge of each pair of mirror images, as the engine's twins: the other edge plays the same move,
 *  turned over. Undefined when the edge is not a book move. */
export function bookMove(p: BookPosition, edge: string): BookMove | undefined {
  const own = p.moves.find(m => m.move === edge);
  if (own || mirrorPosition(p.position) !== p.position) return own;
  const twin = p.moves.find(m => m.move === mirrorEdge(edge));
  return twin && turnMove(twin, true);
}

/** A stored position as the player reached it: `mirrored` when the player's position is its mirror image. A parent
 *  turns over, with its edge, when its `mirrored` differs from the position's. */
function reached(p: BookPosition, mirrored: boolean): BookPosition {
  return {
    ...p,
    position: mirrored ? mirrorPosition(p.position) : p.position,
    parents: p.parents.map(q => (mirrored !== !!q.mirrored
      ? { position: mirrorPosition(q.position), move: mirrorEdge(q.move) } : { position: q.position, move: q.move })),
    moves: p.moves.map(m => turnMove(m, mirrored)),
    outside: p.outside && { ...p.outside, move: mirrored ? mirrorEdge(p.outside.move) : p.outside.move },
    area: mirrored ? mirrorArea(p.area) : p.area,
  };
}

/** A move from a position that turns over or not (`mirrored`). Its edge and its refutation turn with the position,
 *  and its `to` is the image of the stored one when the move's `mirrored` differs from the position's. */
function turnMove({ mirrored: stored, ...m }: BookMove, mirrored: boolean): BookMove {
  const edge = (e: string) => (mirrored ? mirrorEdge(e) : e);
  return {
    ...m,
    move: edge(m.move),
    to: mirrored !== !!stored ? mirrorPosition(m.to) : m.to,
    ...(m.trap ? { trap: { ...m.trap, refutation: m.trap.refutation.map(edge) } } : {}),
  };
}
