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
   *  BookLoadError when the part does not load, and a later call tries again. */
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

type Part = Map<string, BookPosition>;
/** Where the book stores a position: the notation that it stores, its part, and whether the stored position is the
 *  mirror image of the position looked up. */
interface Place { stored: string; part: number; mirrored: boolean }

class FileBook implements Book {
  readonly source: BookSource;
  readonly start: string;
  private readonly urls: string[];
  private readonly read: BookReader;
  private readonly where = new Map<string, number>(); // each stored position's part
  // Each part while it loads, then when it is loaded. A part that did not load has neither, so a later lookup tries
  // again ("Try again", design 32).
  private readonly parts: (Promise<Part> | Part | undefined)[] = [];

  constructor(index: BookIndex, base: string, read: BookReader) {
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

  private load(i: number): Promise<Part> {
    const url = this.urls[i];
    return this.read(url).then(
      file => (this.parts[i] = new Map(checked(file as BookPart).positions.map(p => [p.position, p]))),
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
