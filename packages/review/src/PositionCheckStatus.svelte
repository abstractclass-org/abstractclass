<script lang="ts">
  // What the board editor says of the position being made (Hedge School's design 21, item 10, and Cyanotype's design
  // 33, "The board editor"): whether the engine reads it, and whether a game can reach it, by the engine's position
  // check (`describe`'s `check`). When no game reaches it, the engine's reasons, each in the engine's words, and the
  // line that says where the board marks the places that they name (`places`: Enclosure's "edges", Blueprints'
  // "hexes"). `refused` is the engine's refusal of the position, as the page shows it. `reading`: the engine has not
  // answered for the latest position yet. `children` follow the line for a position that a game reaches (Cyanotype's
  // line for a game that is over).
  import type { Snippet } from "svelte";
  import type { PositionCheck } from "@abstractclass/engine/protocol.ts";
  let { refused, check, places, reading = false, children }:
    { refused: string; check: PositionCheck | null; places: "edges" | "hexes"; reading?: boolean; children?: Snippet } =
    $props();
</script>

<div role="status">
  {#if reading}
    <p class="text-sm text-muted">The engine reads the position…</p>
  {:else if refused}
    <p class="text-sm text-blunder">The engine cannot read this position: {refused}</p>
  {:else if check?.possible}
    <p class="text-sm">A game can reach this position.</p>
    {@render children?.()}
  {:else if check}
    <p class="text-sm">No game reaches this position:</p>
    <ul class="mt-1 pl-5 list-disc text-sm text-blunder">
      {#each check.reasons as r, i (i)}<li>{r.text}</li>{/each}
    </ul>
    <p class="mt-1 text-xs text-muted">The {places} each reason names glow on the board.</p>
  {/if}
</div>
