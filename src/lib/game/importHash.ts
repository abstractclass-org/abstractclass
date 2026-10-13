// What arrives after the import page's `#`, as URL parameters. The browser never sends that part of an address to a
// server.
// - The meaf.us tools (bookmarklet.ts, userscript.ts): the tool, its version, and the game's record. A tool made before
//   it said so sends the record alone. The import page uses the version to tell a player whose tool is out of date
//   (design 11).
// - A link from another site (design 18): `record`, the game's record, and `save`, the page where a partner site takes
//   the review back (partners.ts). Or, from a partner's page that kept a review, `from`, that page's origin: the
//   review file then comes by a window message.

export type Tool = "bookmarklet" | "userscript";

/** The record after the `#`, and what sent it: a tool and its version, none for an older tool's bare record, or a link
 *  from another site with its save page, or the partner's page that sends a kept review. */
export interface ImportHash { record: string; tool: Tool | null; version: string; link: boolean; save: string | null; from: string | null }

export function readImportHash(hash: string): ImportHash {
  if (hash.startsWith("tool=")) {
    const p = new URLSearchParams(hash), tool = p.get("tool");
    return { record: p.get("record") ?? "", tool: tool === "bookmarklet" || tool === "userscript" ? tool : null, version: p.get("v") ?? "",
             link: false, save: null, from: null };
  }
  // Parameters: a record's text starts with a tag, a turn or an edge, never with a name and "=". A link without
  // `record` (one that names it `pgn`, for example) gives an empty record, which the import page refuses by name.
  if (/^[A-Za-z_]+=/.test(hash)) {
    const p = new URLSearchParams(hash);
    return { record: p.get("record") ?? "", tool: null, version: "", link: true, save: p.get("save"), from: p.get("from") };
  }
  return { record: decodeURIComponent(hash), tool: null, version: "", link: false, save: null, from: null };
}

/** The tool that is out of date, or "older" for a tool that sent no version, or null when it is the site's own
 *  version, or the game came by another site's link. `current` gives the site's versions: the bookmark's (its loader)
 *  and the userscript's code. */
export function staleTool(sent: Pick<ImportHash, "tool" | "version"> & { link?: boolean }, current: Record<Tool, string>): Tool | "older" | null {
  if (sent.link) return null;
  if (!sent.tool) return "older";
  return sent.version === current[sent.tool] ? null : sent.tool;
}
