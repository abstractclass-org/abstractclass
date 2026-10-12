// What the meaf.us tools put after the import page's `#` (bookmarklet.ts, userscript.ts): the tool, its version, and
// the game's record, as URL parameters. The browser never sends that part of an address to a server. A tool made
// before it said so sends the record alone. The import page uses the version to tell a player whose tool is out of
// date (design 11).

export type Tool = "bookmarklet" | "userscript";

/** The record after the `#`, and the tool and version that sent it: none for an older tool's bare record. */
export function readImportHash(hash: string): { record: string; tool: Tool | null; version: string } {
  if (!hash.startsWith("tool=")) return { record: decodeURIComponent(hash), tool: null, version: "" };
  const p = new URLSearchParams(hash), tool = p.get("tool");
  return { record: p.get("record") ?? "", tool: tool === "bookmarklet" || tool === "userscript" ? tool : null, version: p.get("v") ?? "" };
}

/** The tool that is out of date, or "older" for a tool that sent no version, or null when it is the site's own
 *  version. `current` gives the site's versions: the bookmark's (its loader) and the userscript's code. */
export function staleTool(sent: { tool: Tool | null; version: string }, current: Record<Tool, string>): Tool | "older" | null {
  if (!sent.tool) return "older";
  return sent.version === current[sent.tool] ? null : sent.tool;
}
