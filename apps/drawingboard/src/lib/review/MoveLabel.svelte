<!-- A move played as the move list shows it (design 33, item 8), as strategyjam.org's move list does: a placement is the
     blueprint's number in a box, then the anchor hex, then +N when it scores. An edit is the kind of the cell that it
     moves, then each blueprint's number in a box with the cell's place in its frame, before and after. The box takes
     the mover's colour, which the move's button gives. A screen reader reads the move's notation. -->
<script lang="ts">
  import Cell from "../board/Cell.svelte";
  import { playedText, type Played } from "./blueprints.ts";

  let { played }: { played: Played } = $props();
  const m = $derived(played.edge);
</script>

{#snippet box(n: number)}<span class="inline-grid place-items-center min-w-[1.35em] h-[1.2em] mr-[0.2em] rounded-[3px] bg-current
  font-sans text-[0.85em] font-bold leading-none"><span class="text-(--on-badge)">{n}</span></span>{/snippet}

<span class="sr-only">{playedText(played)}</span>
<span class="inline-flex items-center whitespace-nowrap" aria-hidden="true">
  {#if !m}pass
  {:else if m.kind === "place"}
    {@render box(m.blueprint)}{m.q},{m.r}{#if played.did.points}<span class="ml-[0.4em]">+{played.did.points}</span>{/if}
  {:else}
    {#if played.drawn.type === "edit"}
      <svg class="size-[1.05em] mr-[0.3em] flex-none" viewBox="-1 -1 2 2"><Cell hex={[0, 0]} owner={played.player} kind={played.drawn.kind} /></svg>
    {/if}
    {@render box(m.from.blueprint)}{m.from.q},{m.from.r}<span class="mx-[0.25em] text-muted">›</span>{@render box(m.to.blueprint)}{m.to.q},{m.to.r}
  {/if}
</span>
