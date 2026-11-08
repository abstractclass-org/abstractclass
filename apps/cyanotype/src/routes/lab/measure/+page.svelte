<script lang="ts">
  // The engine measure on a visitor's device (packages/measure; Hedge School's docs/decisions/engine.md, "The engine
  // measure on a visitor's device"): the review's speed for each pool size, and the GPU against a worker, with
  // Blueprints' engine. No page links to it, and it is noindex. Cyanotype's part: its engine settings' defaults (the
  // lock's network, Lite's depth, the default pool), and the positions of the review's test game (Stamp Duty against
  // itself), the whole game: a late position of Blueprints has more legal placements than an early one, so it costs
  // more.
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import MeasurePage from "@abstractclass/measure/MeasurePage.svelte";
  import type { MeasureSite } from "@abstractclass/measure/run.svelte.ts";
  import { positionQuery } from "@abstractclass/engine/protocol.ts";
  import { defaultEngine, networkName, reviewDepthText, reviewVisits } from "#lib/analysis/engineSettings.ts";
  import { parseRecord } from "#lib/game/record.ts";
  import { SITE_NAME, SITE_VERSION } from "#lib/site.ts";
  import TEST_GAME from "#lib/review/fixtures/stamp-duty.txt?raw";

  function site(): MeasureSite {
    const settings = defaultEngine(), visits = reviewVisits(settings), record = parseRecord(TEST_GAME);
    return {
      site: SITE_NAME, commit: SITE_VERSION,
      game: `Blueprints, the review's test game (${record.tags.Event}, ${record.moves.length} positions)`,
      positions: record.moves.map((_, k) => positionQuery(null, record.moves.slice(0, k))),
      komi: record.komi, network: settings.network, networkName: networkName(settings.network), visits,
      review: reviewDepthText(visits).split(" (")[0], workers: settings.workers,
      // A visit of Blueprints' network took about 60 to 70 ms on a worker of this site's development machine
      // (decisions/engine.md, "Cyanotype's engine pool at Hedge School's size"): 512 visits in about 35 s. A phone's
      // worker is taken as slower.
      searchSeconds: 60,
    };
  }
</script>

<PageMeta title="Engine measure · {SITE_NAME}" noindex />

<MeasurePage name={SITE_NAME} {site} />
