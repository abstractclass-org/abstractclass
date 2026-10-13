// The engine settings' changes as events (design 17): the defaults' test. Each setting by its name, its new value, and
// where it applies: this browser, or one game (a game that keeps its own network and depth, store.ts). The value goes
// as `setting_value`: Google Analytics reads a parameter called `value` as the event's worth, a number.
import { track } from "#lib/analytics.svelte.ts";
import { reviewVisits, type EngineSettings } from "./engineSettings.ts";

const SETTING_NAMES: Record<string, string> = { on: "engine_on", visits: "depth_on_screen", seconds: "time_limit", review: "depth_per_move",
                                                customReview: "depth_per_move", network: "network", workers: "workers", gpu: "gpu" };

/** Sends a change of the engine settings: `settings` before it, `gameScoped` when the game keeps its own network and
 *  depth. */
export function trackSettingChange(change: Partial<EngineSettings>, settings: EngineSettings, gameScoped: boolean) {
  const next = { ...settings, ...change }, names = new Set<string>();
  for (const k of Object.keys(change)) {
    const setting = SETTING_NAMES[k] ?? k;
    if (names.has(setting)) continue;
    names.add(setting);
    const value = setting === "depth_per_move" ? String(reviewVisits(next)) : setting === "network" ? next.network.split("-")[0]
      : String(next[k as keyof EngineSettings] ?? "none");
    track("setting_change", { setting, setting_value: value,
                              setting_scope: gameScoped && (setting === "network" || setting === "depth_per_move") ? "game" : "browser" });
  }
}
