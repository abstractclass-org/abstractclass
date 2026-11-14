// The engine's settings (docs/design/09-engine-settings.md), kept in this browser: whether the engine searches, how
// far it searches the position on screen (KaTrain's max_visits and max_time: whichever comes first), the review's
// budget for each position, which network it uses (Lichess's choice of engine), and how many workers search at once
// (Lichess's threads), and whether the visitor's GPU searches too (@abstractclass/analysis/gpu.svelte.ts). Storage can
// be blocked (a private window, blocked site data): then the defaults hold.
import lock from "../../../engine.lock.json" with { type: "json" };
import { DEEP_VISITS } from "@abstractclass/analysis/cache.ts";
import { defaultPoolSize } from "@abstractclass/engine/pool.ts";
import { megabytes } from "@abstractclass/engine/client.ts";
import { ownSettingsOf, settingsStore, type EngineSettings } from "@abstractclass/analysis/settings.ts";
import { ENGINE_KEY } from "#lib/keys.ts";
// The settings' general part (their shape, the steps, the review's depths) is the shared analysis's: this module gives
// it to the site's code with the site's own part.
export * from "@abstractclass/analysis/settings.ts";

/** A network's name, as the engine's release names it (its manifest's `displayName`, copied into engine.lock.json):
 *  "HedgeFund 0.2 Lite". A name belongs to one network file for life (the engine repository's
 *  games/enclosure/docs/design/20-network-names.md). The id when the lock gives no name. */
export const networkName = (id: string): string => locked(id)?.displayName ?? id;
/** A network's download in MB, from engine.lock.json, which the deploy fetches by: what a change of network costs, as
 *  Lichess's engine menu gives each engine's size. */
export const networkMB = (id: string): string => megabytes(locked(id)?.bytes ?? 0);
/** Whether the site ships the network `id` (engine.lock.json pins it): the networks of the menus (NETWORKS), and the
 *  earlier ones that the lock keeps off them, so that a game, a review file or a Practice game that names one still
 *  loads it. */
export const shipsNetwork = (id: string): boolean => locked(id)?.kind === "model";
const locked = (id: string) => (lock.artifacts as { id: string; kind: string; displayName?: string; bytes: number }[]).find(a => a.id === id);

/** The networks that the settings and Practice offer, as the manifest names them, the default first. Their parameters
 *  are the trainer's counts (the engine repository's games/enclosure/docs/design/15-network-sizes.md). Their memory in
 *  a worker and on the GPU, measured on one machine: decisions/engine.md, "A review's memory". The settings give no
 *  number for it: it depends on the browser and the graphics card. */
export const NETWORKS = [
  { id: "b10c128-s89066368-d17827487", params: "3.2M" },
  { id: "b15c192-s90436608-d18027147", params: "10.3M" },
];
/** Whether the settings and Practice offer the network `id` (NETWORKS). */
export const offersNetwork = (id: string | undefined): boolean => NETWORKS.some(n => n.id === id);

/** A game's own settings (@abstractclass/analysis/settings.ts, ownSettingsOf), from the networks that the menus offer
 *  and the networks that the site ships: `ownSettings`, the settings that a game came with, else those of its last
 *  review when that review's network has left the menus, and `settingsFor`, the network and the review's visits that a
 *  game reviews with. `withOwn` and `changeOwn` come with the general part. */
export const { ownSettings, settingsFor } = ownSettingsOf({ offers: offersNetwork, ships: shipsNetwork });

export const defaultEngine = (): EngineSettings => ({
  on: true, visits: DEEP_VISITS, seconds: 30, review: "lite", customReview: 512, network: NETWORKS[0].id,
  workers: defaultPoolSize(), gpu: "auto",
});

export const { load: loadEngine, save: saveEngine } = settingsStore(ENGINE_KEY, defaultEngine, offersNetwork);
