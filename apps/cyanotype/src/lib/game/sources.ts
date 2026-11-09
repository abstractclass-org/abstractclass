// Cyanotype's ways in, as events (design 33, "Analytics"; Hedge School's designs 17 and 22): the sources
// of its imports, and the import's events (@abstractclass/import's importEvents.ts) and the exports' event
// (@abstractclass/review's exportEvents.ts) with Cyanotype's analytics. The sources have Hedge School's names: the
// ways in that both sites have are the same. Cyanotype lacks Hedge School's others: meaf.us's tools and
// Constellation's export (Enclosure's only), and the tools from before the tools named themselves (Cyanotype's tools
// always name themselves).
import { track } from "#lib/analytics.svelte.ts";
import { EDGE_RANGES, range } from "@abstractclass/site/measure.ts";
import { importEvents } from "@abstractclass/import/importEvents.ts";
import type { Tool } from "@abstractclass/import/importHash.ts";
import { exportEvents } from "@abstractclass/review/exportEvents.ts";

export type { ImportFailure, ImportTo, LoadFailure, LoadSource } from "@abstractclass/import/importEvents.ts";

/** How a game came in from outside. */
export const IMPORT_SOURCES = [
  "pasted_record", // a record pasted in a page's box: the Review tab's, the Analysis board's Import
  "pasted_position", // a position pasted in the Analysis board's Import, with or without moves
  "site_link", // a link with a record or a position (`/import#record=`, `/analysis#record=`, `#position=`)
  "strategyjam_bookmarklet", // the bookmarklet (tools.ts) on strategyjam.org
  "strategyjam_userscript", // the userscript (tools.ts) on strategyjam.org
] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

/** Whether a page's text names an import's source. */
export const isImportSource = (s: string | null): s is ImportSource =>
  (IMPORT_SOURCES as readonly (string | null)[]).includes(s);

/** A tool's source: Cyanotype's tools read strategyjam.org's pages only. */
export const toolSource = (tool: Tool): ImportSource => `strategyjam_${tool}`;

export const { trackImport, trackImportFailed, trackLoad, trackLoadFailed } =
  importEvents<ImportSource>({ track, range: n => range(n, EDGE_RANGES) });

/** An export done in an Export menu, by its kind, and a link by its length. */
export const trackExport = exportEvents(track);
