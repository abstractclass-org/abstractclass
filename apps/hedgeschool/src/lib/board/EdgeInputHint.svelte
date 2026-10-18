<script lang="ts">
  // What the edge input (edgeInput.svelte.ts) waits for, or why its last click did nothing: the puzzles' and the
  // lessons' words. `player`: the mover.
  import { PLAYER_NAME, type Player } from "#lib/review/model.ts";
  import type { EdgeInput } from "./edgeInput.svelte.ts";

  let { input, player }: { input: EdgeInput; player: Player } = $props();
  const side = $derived(PLAYER_NAME[player]);
</script>

<p class="text-sm text-muted">
  {#if input.refused === "start"}Start the edge at one of {side}'s nodes.
  {:else if input.refused === "end"}Finish the edge at a marked point, or click another of {side}'s nodes.
  {:else if input.pending}Now click its second point{input.ends ? ": a marked point" : ", at most 3 apart"}.
  {:else if input.rules}Click one of {side}'s nodes to start the edge.
  {:else}Click the edge's first point.{/if}
</p>
