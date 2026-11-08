<script lang="ts">
  // The section "Hard positions" of the sites' pages "How a review works" (Hedge School's design 14): KaTrain's
  // complexity (model.ts, complexity) and the hard position's threshold (labels.ts, HARD). `moves` is the site's word
  // for a game's moves ("edges" on Hedge School), and `children` adds the site's own text after the section's.
  import type { Snippet } from "svelte";
  import { HARD } from "@abstractclass/analysis/labels.ts";
  let { moves, children }: { moves: string; children?: Snippet } = $props();
</script>

<h2>Hard positions</h2>
<p>A position's <strong>complexity</strong> is KaTrain's: the average loss of the {moves} that the engine searched, each
  weighed by how likely the network thinks a strong player would choose it. A complexity of {HARD.toFixed(2)} or more is
  a <strong>hard position</strong>, marked ◆: there, the likely {moves} lose a Mistake's worth on average. A turn is as
  hard as its harder position. The Difficulty chart, beside the Advantage chart, shows each turn's complexity, so you
  can see whether the mistakes fell where the game was hard.</p>
{@render children?.()}
