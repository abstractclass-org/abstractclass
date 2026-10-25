<script lang="ts" module>
  /** A part of a skeleton (Nielsen Norman Group's skeleton screen): a grey bar where text or a picture will be. */
  export const BONE = "rounded bg-panel-2 motion-safe:animate-pulse";
</script>

<script lang="ts">
  // A player in a skeleton's row above the board (the review's, the Analysis board's, Practice's): the card's own layout
  // (PlayerCard), with bars as high as its text where the text is not known yet, so that the row has the card's height.
  import Swatch from "#lib/ui/Swatch.svelte";
  import { AREA_DOT, playerBox, playerName, playerNumbers } from "./PlayerCard.svelte";
  import type { Player } from "./enclosure.ts";

  let { player: p, name, tag = null }: { player: Player; name?: string; tag?: string | null } = $props();
</script>

<div class={playerBox(p)}>
  <span class={playerName(p)}>
    <Swatch player={p} />
    {#if name}<span class="font-semibold truncate">{name}</span>
    {:else}<span class="font-semibold {BONE}"><span class="invisible">A player</span></span>{/if}
    {#if tag}<span class="text-xs text-muted">{tag}</span>{/if}
  </span>
  <span class={playerNumbers(p)}>
    <span class={BONE}><span class="invisible"><strong class="text-[1.1em]">0</strong> points</span></span>
    <span class={[AREA_DOT, "invisible"]} aria-hidden="true">·</span>
    <span class={BONE}><span class="invisible"><strong class="text-[1.1em]">0</strong> area</span></span>
  </span>
</div>
