<!-- A move played as the lists write it in glyphs (design 33, item 8): its parts from glyphOf (blueprints.ts). The
     boxes and the cell take the colour of the text round it: the mover's, which the move's button gives, or the
     table's. Their digits and marks are white, or the colour that the text round them gives (--on-text: the table's
     ground, so that they show on its text colour in both themes). A screen reader reads the move's notation, and the
     title gives it. The glyphs sit on the middle of the line (align-middle): an edit begins with its cell's picture,
     whose baseline is its lower edge, and on the line's baseline it would stand higher than a placement's boxes and
     make the line taller. -->
<script lang="ts">
  import Cell from "../board/Cell.svelte";
  import { glyphOf, playedText, type Played } from "./blueprints.ts";

  let { played }: { played: Played } = $props();
  const parts = $derived(glyphOf(played)), text = $derived(playedText(played));
</script>

{#snippet box(n: number)}<span class="inline-grid place-items-center min-w-[1.35em] h-[1.2em] mr-[0.2em] rounded-[3px] bg-current
  font-sans text-[0.85em] font-bold leading-none"><span class="text-[color:var(--on-text,var(--on-badge))]">{n}</span></span>{/snippet}

<span class="sr-only">{text}</span>
<span class="inline-flex items-center align-middle whitespace-nowrap" aria-hidden="true" title={text}>
  {#each parts as part, k (k)}
    {#if part.kind === "box"}{@render box(part.n)}
    {:else if part.kind === "place"}{part.text}
    {:else if part.kind === "cell"}<svg class="size-[1.05em] mr-[0.3em] flex-none" viewBox="-1 -1 2 2"><Cell hex={[0, 0]} owner={played.player} kind={part.cell} inText /></svg>
    {:else if part.kind === "arrow"}<span class="mx-[0.25em] text-muted">›</span>
    {:else if part.kind === "points"}<span class="ml-[0.4em]">+{part.points}</span>
    {:else if part.kind === "x"}<span class="ml-[0.15em] text-[0.8em]">x</span>
    {:else}pass{/if}
  {/each}
</span>
