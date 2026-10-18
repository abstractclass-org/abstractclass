<script lang="ts">
  // What the edge input (edgeInput.svelte.ts) waits for, or why its last click did nothing: the puzzles' and the
  // lessons' words. `side`: the mover's name.
  import type { EdgeInput } from "./edgeInput.svelte.ts";

  let { input, side }: { input: EdgeInput; side: string } = $props();
</script>

<p class="text-sm text-muted">
  {#if input.refused === "start"}Start the edge at one of {side}'s nodes.
  {:else if input.refused === "end"}Finish the edge at a marked point, or click another of {side}'s nodes.
  {:else if input.pending}Now its second point{input.ends ? ": a marked point" : ", at most 3 apart"}.
  {:else if input.rules}Click one of {side}'s nodes to start the edge.
  {:else}Click the edge's first point.{/if}
</p>
