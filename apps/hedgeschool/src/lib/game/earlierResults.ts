// An earlier engine's results, and an earlier network file's, removed when no stored game needs them (design 20): the
// shared removal (@abstractclass/analysis/earlierResults.ts), with Hedge School's engine and its store of games. The
// layout loads it at the site's start when the removal is due (@abstractclass/analysis/cache.ts, removeUnreadResults).
import lock from "../../../engine.lock.json" with { type: "json" };
import type { Manifest } from "@abstractclass/engine/client.ts";
import { removeUnneeded } from "@abstractclass/analysis/earlierResults.ts";
import { readGames } from "./store.ts";

// Which stored results nothing reads: the shared rule, which this site's tests check on Enclosure's games.
export { unneededResults } from "@abstractclass/analysis/earlierResults.ts";

/** Removes the stored results that no game needs, for `files`, the site's engine files (the build's ENGINE_FILES),
 *  which the browser's mark keeps after the removal. */
export const removeEarlierResults = (files: string) => removeUnneeded(files, lock as unknown as Manifest, readGames);
