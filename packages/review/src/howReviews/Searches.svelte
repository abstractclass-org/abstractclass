<script lang="ts">
  // The section "The searches" of the sites' pages "How a review works" (Hedge School's designs 05 and 16): the
  // review's three searches, with the visits of the shared analysis (cache.ts, settings.ts). Both sites review with the
  // same steps and depths, so a change there changes both pages.
  import { DEEP_VISITS, SWEEP_VISITS } from "@abstractclass/analysis/cache.ts";
  import { REVIEW_PRESETS } from "@abstractclass/analysis/settings.ts";
  const n = (v: number) => v.toLocaleString("en");
</script>

<h2>The searches</h2>
<p>A search counts its work in <strong>visits</strong>: each visit adds one position to the search, down the lines that
  look best so far. More visits give a better estimate, and take longer.</p>
<ul>
  <li><strong>A first look</strong> at every position, at {n(SWEEP_VISITS)} visits, draws the chart's first estimate.</li>
  <li><strong>The label stage</strong> searches every position at the review's depth: {n(REVIEW_PRESETS.lite)} visits
    with Lite, the default, and {n(REVIEW_PRESETS.standard)} with Standard (the engine's settings).</li>
  <li><strong>The position on screen</strong> gets a search to the Depth setting, {n(DEEP_VISITS)} visits by default.
    Each position keeps its deepest result, and everything follows it: the quality labels of the moves into and out of
    it, the report and the chart. So a position you look at closely can change its labels.</li>
</ul>
<p>Your browser keeps the results, so a game reviewed before opens at once.</p>
