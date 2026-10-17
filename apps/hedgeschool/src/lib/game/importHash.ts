// What arrives after a page's `#`, as URL parameters: the site's ways in (design 22). The browser never sends that
// part of an address to a server, and the analytics start only once it holds no game (holdsGame).
// - The review's (`/review`, and `/import` while it forwards there):
//   - the tools for meaf.us and strategyjam.org (bookmarklet.ts, userscript.ts): the tool, its version, the site that
//     it ran on, and the game's record. A tool made before it said so sends the record alone, and one made before it
//     named the site sends no site (meaf.us). The review uses the version to tell a player whose tool is out of date
//     (design 11);
//   - a link from another site (design 18): `record`, the game's record, and `save`, the page where a partner site
//     takes the review back (partners.ts). Or, from a partner's page that kept a review, `from`, that page's origin:
//     the review file then comes by a window message;
//   - `packed`, a shared review (share.ts), and `game`, a game kept in this browser.
// - The Analysis board's (`/analysis`): `record`, `packed` (a shared analysis), and `at`, the position on screen.

import type { ImportSource } from "./importEvents.ts";

export type Tool = "bookmarklet" | "userscript";

/** The tab's session key that the old import page sets before it forwards to the review (design 22). */
export const FORWARDED = "hedge-school:forwarded-from-import";

/** The record after the `#`, and what sent it: a tool, its version and the site it ran on, none for an older tool's
 *  bare record, or a link from another site with its save page, or the partner's page that sends a kept review. */
export interface ImportHash {
  record: string; tool: Tool | null; version: string; site: string | null; link: boolean; save: string | null; from: string | null;
}

/** The parameters after the `#`, or null for a bare record (an older tool's): a record's text starts with a tag, a turn
 *  or an edge, never with a name and "=". */
export const hashParams = (hash: string) => (/^[A-Za-z_]+=/.test(hash) ? new URLSearchParams(hash) : null);

/** What sent a record, for a way in that does not say. */
const NO_SENDER = { tool: null, version: "", site: null, link: false, save: null, from: null } as const;

export function readImportHash(hash: string): ImportHash {
  if (hash.startsWith("tool=")) {
    const p = new URLSearchParams(hash), tool = p.get("tool");
    return { ...NO_SENDER, record: p.get("record") ?? "", tool: tool === "bookmarklet" || tool === "userscript" ? tool : null,
             version: p.get("v") ?? "", site: p.get("site") };
  }
  // A link without `record` (one that names it `pgn`, for example) gives an empty record, which the import page refuses
  // by name.
  const p = hashParams(hash);
  if (p) return { ...NO_SENDER, record: p.get("record") ?? "", link: true, save: p.get("save"), from: p.get("from") };
  return { ...NO_SENDER, record: decodeURIComponent(hash) };
}

/** A tool's way in, for the import events (design 17): the tool, on the site that it ran on. A tool that names no
 *  site ran on meaf.us. */
export const toolSource = (tool: Tool, site: string | null): ImportSource =>
  site === "strategyjam.org" ? `strategyjam_${tool}` : tool;

/** The tool that is out of date, or "older" for a tool that sent no version, or null when it is the site's own
 *  version, or the game came by another site's link. `current` gives the site's versions: the bookmark's (its loader)
 *  and the userscript's code. */
export function staleTool(sent: Pick<ImportHash, "tool" | "version"> & { link?: boolean }, current: Record<Tool, string>): Tool | "older" | null {
  if (sent.link) return null;
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
