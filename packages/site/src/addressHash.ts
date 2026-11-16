// Whether the part of an address after its `#` holds a game. The browser never sends that part to a server, but the
// analytics and the error reports could: the analytics start only once it holds no game (design 22), and the error
// reports' scrubber hides it when it holds one (scrub.ts). The import's frame reads the rest of that part
// (@abstractclass/import's importHash.ts, which gives these two functions to its callers too). They are here, below
// the import's frame, so that the site's package does not depend on it (design 29, "The packages' order").

/** The parameters after the `#`, or null for a bare record (an older tool's): a record's text starts with a tag, a turn
 *  or a move, never with a name and "=". */
export const hashParams = (hash: string) => (/^[A-Za-z_]+=/.test(hash) ? new URLSearchParams(hash) : null);

/** Whether the part after `#` holds a game: a record, a packed review or analysis, a tool's record, or a partner's
 *  page that sends one. The analytics start only once a page has taken it out of the address (design 22). A kept
 *  game's id and a place on the board name no game's moves. */
export function holdsGame(hash: string): boolean {
  const h = hash.replace(/^#/, "");
  if (!h) return false;
  const p = hashParams(h);
  return !p || [...p.keys()].some(k => k !== "game" && k !== "at"); // none: an older tool's bare record
}
