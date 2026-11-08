<script lang="ts">
  // The section "The likely moves' meter" of the sites' pages "How a review works" (Hedge School's design 14): Maia's
  // Blunder Meter on the network's priors (model.ts, likelyMoves), in the groups of labels.ts's METER_GROUPS, which cut
  // at the bands' limits (WIN_BANDS). `moves` is the site's word for a game's moves ("edges" on Hedge School).
  import { type Label, WIN_BANDS } from "@abstractclass/analysis/labels.ts";
  import { wholePct } from "./format.ts";
  let { moves }: { moves: string } = $props();
  const upTo = (label: Label) => wholePct(WIN_BANDS.find(([l]) => l === label)![1]);
</script>

<h2>The likely {moves}' meter</h2>
<p>Under the engine's line, the meter shows what the network expects a player to choose here, as Maia's Blunder Meter
  does. It adds up the network's likelihood of the searched {moves}, by how much each one loses against the best: good
  or better (up to {upTo("good")}), Inaccuracy (up to {upTo("inaccuracy")}), Mistake (up to {upTo("mistake")}) and
  Blunder. The grey rest is the {moves} that the search did not reach.</p>
