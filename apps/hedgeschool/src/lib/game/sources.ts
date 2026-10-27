// Hedge School's ways in, as events (design 17, design 22): the sources of its imports, and the import's events
// (@abstractclass/import's importEvents.ts) with Hedge School's analytics. Beside the ways in of every site, Hedge
// School's sources name meaf.us's tools and Constellation's export.
import { track } from "#lib/analytics.svelte.ts";
import { EDGE_RANGES, range } from "#lib/measure.ts";
import { importEvents } from "@abstractclass/import/importEvents.ts";

export type { ImportFailure, ImportTo, LoadFailure, LoadSource } from "@abstractclass/import/importEvents.ts";

/** How a game came in from outside. */
export const IMPORT_SOURCES = [
  "pasted_record", // a record pasted in a page's box
  "pasted_constellation", // Constellation's export pasted in a page's box (constellation.ts)
  "pasted_position", // a position pasted in the Analysis board's Import, with or without moves (design 21)
  "site_link", // another site's link with a record or a position (`#record=`, `#position=`, design 18)
  "bookmarklet", // the bookmarklet (tools.ts) on meaf.us
  "userscript", // the userscript (tools.ts) on meaf.us
  "strategyjam_bookmarklet", // the bookmarklet on strategyjam.org
  "strategyjam_userscript", // the userscript on strategyjam.org
  "older_tool", // a meaf.us tool from before the tools named themselves (importHash.ts)
] as const;
export type ImportSource = (typeof IMPORT_SOURCES)[number];

/** Whether a page's text names an import's source. */
export const isImportSource = (s: string | null): s is ImportSource =>
  (IMPORT_SOURCES as readonly (string | null)[]).includes(s);

export const { trackImport, trackImportFailed, trackLoad, trackLoadFailed } =
  importEvents<ImportSource>({ track, range: n => range(n, EDGE_RANGES) });
