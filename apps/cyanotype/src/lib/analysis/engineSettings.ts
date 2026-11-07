// The engine's settings on Cyanotype (Hedge School's design 09), kept in this browser: their general part is the
// shared analysis's (@abstractclass/analysis/settings.ts). Cyanotype's own part: its networks, from its
// engine.lock.json, and its defaults. The GPU's setting is Hedge School's: Auto by default, which tests the GPU on its
// first use (@abstractclass/analysis/gpu.svelte.ts, Hedge School's design 15), and On and Off. The pool is Hedge
// School's: half the processor's threads, at most 8 (@abstractclass/engine/pool.ts, defaultPoolSize), and the session
// ends its idle workers (releaseWhenIdle). With the release engine-91ab0b7d, a worker starts in under 0.7 seconds and
// holds 56 MB, less than Hedge School's 87 MB (docs/decisions/engine.md, "Cyanotype's engine pool at Hedge School's
// size").
import lock from "../../../engine.lock.json" with { type: "json" };
import { DEEP_VISITS } from "@abstractclass/analysis/cache.ts";
import { megabytes } from "@abstractclass/engine/client.ts";
import { defaultPoolSize } from "@abstractclass/engine/pool.ts";
import { settingsStore, type EngineSettings } from "@abstractclass/analysis/settings.ts";
import { ENGINE_KEY } from "../site.ts";
export * from "@abstractclass/analysis/settings.ts";

type Locked = { id: string; kind: string; displayName?: string; bytes: number };

/** The networks that the site ships (engine.lock.json), the default first: the engine's settings and Practice's card
 *  offer them. Each by its release's name (its manifest's `displayName`), which is the network's own id until a release
 *  gives it a number of Stamp Duty, and with its download in bytes. */
export const NETWORKS = (lock.artifacts as Locked[]).filter(a => a.kind === "model")
  .map(a => ({ id: a.id, name: a.displayName ?? a.id, bytes: a.bytes }));
/** Whether the settings offer the network `id`. */
export const offersNetwork = (id: string | undefined): boolean => NETWORKS.some(n => n.id === id);
/** A network's name, or its id where the site does not ship it. */
export const networkName = (id: string): string => NETWORKS.find(n => n.id === id)?.name ?? id;
/** A network's download in MB. */
export const networkMB = (id: string): string => megabytes(NETWORKS.find(n => n.id === id)?.bytes ?? 0);

export const defaultEngine = (): EngineSettings => ({
  on: true, visits: DEEP_VISITS, seconds: 30, review: "lite", customReview: 512, network: NETWORKS[0].id,
  workers: defaultPoolSize(), gpu: "auto",
});

export const { load: loadEngine, save: saveEngine } = settingsStore(ENGINE_KEY, defaultEngine, offersNetwork);
