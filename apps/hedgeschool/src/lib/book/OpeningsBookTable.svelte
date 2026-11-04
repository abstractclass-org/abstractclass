<script lang="ts">
  // The book's table on Openings (design 32, item 5): the review's table (ReviewBookTable.svelte), with "Also reached
  // by" under its title row at a position that other move orders reach across turns, a link to each line (tree.ts,
  // `alsoReached`).
  import type { Snippet } from "svelte";
  import ReviewBookTable from "./ReviewBookTable.svelte";
  import type { OpeningsPlace } from "./openings.svelte.ts";

  let { place, onplay, candidates }: {
    place: OpeningsPlace; onplay: (edges: string[], refutation: boolean) => void; candidates: Snippet;
  } = $props();
</script>

<ReviewBookTable {place} {onplay} {candidates}>
  {#snippet lead()}
    {#if place.also.length}
      <p class="flex-none mb-1.5 text-xs">Also reached by:
        {#each place.also as l, k (l.text)}{k ? ", " : ""}<button type="button" class="p-0 text-accent bg-transparent border-0 underline"
                                                                 onclick={() => place.go(l.to)}>{l.text}</button>{/each}
      </p>
    {/if}
  {/snippet}
</ReviewBookTable>
