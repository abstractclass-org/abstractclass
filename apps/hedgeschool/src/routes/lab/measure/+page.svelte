<script lang="ts">
  // The engine measure on a visitor's device (packages/measure; docs/decisions/engine.md, "The engine measure on a
  // visitor's device"): the review's speed for each pool size, and the GPU against a worker. No page links to it, and it
  // is noindex. It is in the early access, so that the dev preview serves it. Hedge School's part: its engine settings'
  // defaults (the network, Lite's depth, the default pool), and the positions of the sample game.
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import MeasurePage from "@abstractclass/measure/MeasurePage.svelte";
  import type { MeasureSite } from "@abstractclass/measure/run.svelte.ts";
  import { positionQuery } from "@abstractclass/engine/protocol.ts";
  import { defaultEngine, networkName, reviewDepthText, reviewVisits } from "#lib/analysis/engineSettings.ts";
  import { SAMPLE, SAMPLE_MOVES } from "#lib/mock/sample.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/edition.ts";

  function site(): MeasureSite {
    const settings = defaultEngine(), visits = reviewVisits(settings);
    return {
      site: SITE_NAME, commit: SITE_VERSION,
      game: `Enclosure, the sample game (${SAMPLE.players.blue} against ${SAMPLE.players.red}, ${SAMPLE_MOVES.length} positions)`,
      positions: SAMPLE_MOVES.map((_, k) => positionQuery(null, SAMPLE_MOVES.slice(0, k))),
      network: settings.network, networkName: networkName(settings.network), visits,
      review: reviewDepthText(visits).split(" (")[0], workers: settings.workers,
      // A worker of a fast laptop searched 62 visits a second with HedgeFund 0.1 Lite (decisions/engine.md, "Speed on
      // a laptop"): 512 visits in about 8 s. A phone's worker is taken as about 2.5 times slower.
      searchSeconds: 20,
    };
  }
</script>

<PageMeta title="Engine measure · {SITE_NAME}" noindex />

<MeasurePage name={SITE_NAME} {site} />
