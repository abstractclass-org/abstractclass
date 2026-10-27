// What arrives after a page's `#`, as URL parameters: the site's ways in (design 22). The browser never sends that
// part of an address to a server, and the analytics start only once it holds no game (holdsGame).
// - The import page's (`/import`): every game that comes in from outside.
//   - A site's tools for a game site's pages (bookmarklet.ts, userscript.ts) send the tool, its version, the site that
//     it ran on, the position that its page showed, and the game's record. Hedge School's tools made before they said
//     so send the record alone, and those made before they named the site send no site (meaf.us). The page uses the
//     version to tell a player whose tool is out of date (design 11).
//   - A link from another site (design 18): `record`, the game's record, and `save`, the page where a partner site
//     takes the review back (Hedge School's partners.ts).
// - The review's (`/review`): `game`, a game kept in this browser. Its arrival step takes the others (reviewArrives):
//   `packed`, a shared review, `from`, the origin of a partner's page that kept a review, which then sends the review
//   file by a window message, and a tool's game from a tool older than the import page.
// - The Analysis board's (`/analysis`): `record`, `packed` (a shared analysis), and `at`, the position on screen.

export type Tool = "bookmarklet" | "userscript";

/** The record after the `#`, and what sent it: a tool, its version, the site it ran on and the position that its page
 *  showed, none for an older tool's bare record, or a link from another site with its save page, or the partner's page
 *  that sends a kept review. */
export interface ImportHash {
  record: string; tool: Tool | null; version: string; site: string | null; at: number | null; link: boolean; save: string | null;
  from: string | null;
}

/** The parameters after the `#`, or null for a bare record (an older tool's): a record's text starts with a tag, a turn
 *  or a move, never with a name and "=". */
export const hashParams = (hash: string) => (/^[A-Za-z_]+=/.test(hash) ? new URLSearchParams(hash) : null);

/** What sent a record, for a way in that does not say. */
const NO_SENDER = { tool: null, version: "", site: null, at: null, link: false, save: null, from: null } as const;

/** Whether the part after the `#` is a tool's game (bookmarklet.ts, userscript.ts). */
const fromTool = (hash: string) => hash.startsWith("tool=");

export function readImportHash(hash: string): ImportHash {
  if (fromTool(hash)) {
    const p = new URLSearchParams(hash), tool = p.get("tool"), at = p.get("at") ?? "";
    return { ...NO_SENDER, record: p.get("record") ?? "", tool: tool === "bookmarklet" || tool === "userscript" ? tool : null,
             version: p.get("v") ?? "", site: p.get("site"), at: /^\d+$/.test(at) ? Number(at) : null };
  }
  // A link without `record` (one that names it `pgn`, for example) gives an empty record, which the import page refuses
  // by name.
  const p = hashParams(hash);
  if (p) return { ...NO_SENDER, record: p.get("record") ?? "", link: true, save: p.get("save"), from: p.get("from") };
  return { ...NO_SENDER, record: decodeURIComponent(hash) };
}

/** The Analysis board's address for a tool's game (design 21): its record, the position that its page showed, else the
 *  game's end (after its `moves`), and the import's source for the board's events (design 17, importEvents.ts). The
 *  board opens a position past the end at the end. */
export function analysisAddress(sent: Pick<ImportHash, "record" | "at">, moves: number, source: string): string {
  return "/analysis#" + new URLSearchParams({ record: sent.record, at: String(sent.at ?? moves), via: source });
}

/** The tool that is out of date, or "older" for a tool that sent no version, or null when it is the site's own
 *  version. `current` gives the site's versions: the bookmark's (its loader) and the userscript's code. */
export function staleTool(sent: Pick<ImportHash, "tool" | "version">, current: Record<Tool, string>): Tool | "older" | null {
  if (!sent.tool) return "older";
  return sent.version === current[sent.tool] ? null : sent.tool;
}

/** Whether the part after `#` holds a game: a record, a packed review or analysis, a tool's record, or a partner's
 *  page that sends one. The analytics start only once a page has taken it out of the address (design 22). A kept
 *  game's id and a place on the board name no game's moves. */
export function holdsGame(hash: string): boolean {
  const h = hash.replace(/^#/, "");
  if (!h) return false;
  const p = hashParams(h);
  return !p || [...p.keys()].some(k => k !== "game" && k !== "at"); // none: an older tool's bare record
}

/** Whether the review's arrival step takes the part after its `#` (design 22): a shared review, a partner's page that
 *  sends a kept review back, or a tool's game from a tool older than the import page. The import page takes the other
 *  games from outside. For a link's record or an older tool's bare record, the review shows the Review tab, and the
 *  analytics wait while the record stays in the address (holdsGame). */
export function reviewArrives(hash: string): boolean {
  const h = hash.replace(/^#/, ""), p = hashParams(h);
  return fromTool(h) || !!p && (p.has("packed") || p.has("from"));
}
