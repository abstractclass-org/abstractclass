<script lang="ts">
  // The engine measure on a visitor's device (packages/measure; docs/decisions/engine.md, "The engine measure on a
  // visitor's device"): the review's speed for each pool size, and the GPU against a worker. No page links to it, and it
  // is noindex. It is in the early access, so that the dev preview serves it. Hedge School's part: its engine settings'
  // defaults (the network, Lite's depth, the default pool), and the moves of the sample game.
  import MeasurePage from "@abstractclass/measure/MeasurePage.svelte";
  import type { MeasureSite } from "@abstractclass/measure/run.svelte.ts";
  import { defaultEngine, networkName } from "#lib/analysis/engineSettings.ts";
  import { SAMPLE, SAMPLE_MOVES } from "#lib/mock/sample.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/edition.ts";

  function site(): MeasureSite {
    const settings = defaultEngine();
    return {
      commit: SITE_VERSION, settings, networkName: networkName(settings.network), moves: SAMPLE_MOVES,
      game: `Enclosure, the sample game (${SAMPLE.players.blue} against ${SAMPLE.players.red}, ${SAMPLE_MOVES.length} positions)`,
      // A worker of a fast laptop searched 62 visits a second with HedgeFund 0.1 Lite (decisions/engine.md, "Speed on
      // a laptop"): 512 visits in about 8 s. A phone's worker is taken as about 2.5 times slower.
      searchSeconds: 20,
    };
  }
</script>

<MeasurePage name={SITE_NAME} {site} />
