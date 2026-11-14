// The points bar's settings on a Practice page (Hedge School's design 24, item 12), as the page's state: read from the
// site's key at the page's start, kept again at each change, and each change counted as a feature used (Hedge School's
// design 17). Call it while the page's component starts: its effect lives as long as the page.
import { SCORE_FEATURES, scoreStore, type ScoreDisplay } from "./practice.ts";

/** The settings kept under `key`. `area` says whether the game offers the area's lane, and `used` counts a feature. */
export function keptScore(key: string, area: boolean, used: (feature: string) => void): ScoreDisplay {
  const store = scoreStore(key, area);
  const score = $state<ScoreDisplay>(store.load());
  let was = $state.snapshot(score);
  $effect(() => {
    const now = $state.snapshot(score);
    store.save(now);
    for (const [k, name] of SCORE_FEATURES) if (now[k] !== was[k]) used(name);
    was = now;
  });
  return score;
}
