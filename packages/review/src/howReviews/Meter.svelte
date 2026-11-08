<script lang="ts">
  // The section "The likely moves' meter" of the sites' pages "How a review works" (Hedge School's design 14): Maia's
  // Blunder Meter on the network's priors (model.ts, likelyMoves), in the groups of the labels' bands (labels.ts,
  // METER_GROUPS). `moves` is the site's word for a game's moves ("edges" on Hedge School), in the heading too, and
  // `children` adds the site's own text after the section's.
  import type { Snippet } from "svelte";
  import { WIN_BANDS } from "@abstractclass/analysis/labels.ts";
  let { moves, children }: { moves: string; children?: Snippet } = $props();
  const upTo = (label: string) => `${Math.round(100 * WIN_BANDS.find(([l]) => l === label)![1])}%`;
</script>

<h2>The likely {moves}' meter</h2>
<p>Under the engine's line, the meter shows what the network expects a player to choose here, as Maia's Blunder Meter
  does. It adds up the network's likelihood of the searched {moves}, by how much each one loses against the best: good
  or better (up to {upTo("good")}), Inaccuracy (up to {upTo("inaccuracy")}), Mistake (up to {upTo("mistake")}) and
  Blunder. The grey rest is the {moves} that the search did not reach.</p>
{@render children?.()}
