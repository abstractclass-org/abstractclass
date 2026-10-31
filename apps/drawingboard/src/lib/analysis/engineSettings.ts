// The engine's settings on Drawing Board (Hedge School's design 09), kept in this browser: their general part is the
// shared analysis's (@abstractclass/analysis/settings.ts). Drawing Board's own part: its networks, from its
// engine.lock.json, and its defaults. The engine runs on the CPU only (design 33, "The engine's files"): the GPU stays
// off, and the settings do not offer it. A worker of Stamp Duty's early build takes about 7 seconds and 331 MB to
// start (the engine repository's abscls-qyms), so the pool starts with 2 workers and keeps them while the page is open.
import lock from "../../../engine.lock.json" with { type: "json" };
import { DEEP_VISITS } from "@abstractclass/analysis/cache.ts";
import { megabytes } from "@abstractclass/engine/client.ts";
import { maxWorkers, settingsStore, type EngineSettings } from "@abstractclass/analysis/settings.ts";
import { ENGINE_KEY } from "../site.ts";
export * from "@abstractclass/analysis/settings.ts";

type Locked = { id: string; kind: string; displayName?: string; bytes: number };
const locked = (id: string) => (lock.artifacts as Locked[]).find(a => a.id === id);

/** The networks that the site ships (engine.lock.json), the default first: the settings offer them. */
export const NETWORKS = (lock.artifacts as Locked[]).filter(a => a.kind === "model").map(a => ({ id: a.id }));
/** Whether the settings offer the network `id`. */
export const offersNetwork = (id: string | undefined): boolean => NETWORKS.some(n => n.id === id);
/** A network's name: the release's name (its manifest's `displayName`), else its id until a release names it. */
export const networkName = (id: string): string => locked(id)?.displayName ?? id;
/** A network's download in MB, from engine.lock.json. */
export const networkMB = (id: string): string => megabytes(locked(id)?.bytes ?? 0);

/** The pool's workers at first: few, for each one's start and memory (abscls-qyms). */
const FIRST_WORKERS = 2;

export const defaultEngine = (): EngineSettings => ({
  on: true, visits: DEEP_VISITS, seconds: 30, review: "lite", customReview: 512, network: NETWORKS[0].id,
  workers: Math.min(FIRST_WORKERS, maxWorkers()), gpu: "off",
});

/** The kept settings, with the GPU off whatever was kept: Drawing Board runs the engine on the CPU only. */
const store = settingsStore(ENGINE_KEY, defaultEngine, offersNetwork);
export const loadEngine = (): EngineSettings => ({ ...store.load(), gpu: "off" });
export const saveEngine = store.save;
