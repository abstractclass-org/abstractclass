// The engine's settings on Cyanotype (Hedge School's design 09), kept in this browser: their general part is the
// shared analysis's (@abstractclass/analysis/settings.ts). Cyanotype's own part: its networks, from its
// engine.lock.json, and its defaults. The engine runs on the CPU until Blueprints has a GPU build for the browser
// (abscls-wqdl, abscls-8tl1.29; design 33, "The engine's files"): until then the GPU stays off, and the settings do
// not offer it. A worker of Stamp Duty's early build takes about 7 seconds and 331 MB to
// start (the engine repository's abscls-qyms), so the pool starts with 2 workers and keeps them while the page is open.
import lock from "../../../engine.lock.json" with { type: "json" };
import { DEEP_VISITS } from "@abstractclass/analysis/cache.ts";
import { megabytes } from "@abstractclass/engine/client.ts";
import { maxWorkers, settingsStore, type EngineSettings } from "@abstractclass/analysis/settings.ts";
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

/** The pool's workers at first: few, for each one's start and memory (abscls-qyms). */
const FIRST_WORKERS = 2;

export const defaultEngine = (): EngineSettings => ({
  on: true, visits: DEEP_VISITS, seconds: 30, review: "lite", customReview: 512, network: NETWORKS[0].id,
  workers: Math.min(FIRST_WORKERS, maxWorkers()), gpu: "off",
});

/** The kept settings, with the GPU off whatever was kept: Cyanotype runs the engine on the CPU until Blueprints has a
 *  GPU build for the browser (abscls-wqdl, abscls-8tl1.29). */
const store = settingsStore(ENGINE_KEY, defaultEngine, offersNetwork);
export const loadEngine = (): EngineSettings => ({ ...store.load(), gpu: "off" });
export const saveEngine = store.save;
