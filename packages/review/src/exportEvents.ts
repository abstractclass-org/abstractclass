// An export done in the Export menu (ExportMenu.svelte), as an event (Hedge School's design 17): its kind, and a link
// by its length, as a range, and whether it is too long for a Discord message. A site gives its analytics' events.
import { DISCORD_LIMIT } from "@abstractclass/analysis/share.ts";
import { LINK_RANGES, range } from "@abstractclass/site/measure.ts";
import type { ExportKind, ExportResult } from "./exports.ts";

/** The function that the Export menus take as `ontrack`, which sends each export to the site's analytics. */
export function exportEvents(track: (name: string, params: Record<string, string | number | boolean>) => void) {
  return function trackExport(kind: ExportKind, r: ExportResult | void) {
    track("export", r?.linkLength ? { export_kind: kind, link_length: range(r.linkLength, LINK_RANGES), link_too_long: r.linkLength > DISCORD_LIMIT }
                                  : { export_kind: kind });
  };
}
