<script lang="ts">
  // The section "The quality labels" of the sites' pages "How a review works" (Hedge School's design 10): a move's loss
  // and the bands (labels.ts, WIN_BANDS), Best, Great (ONLY_MOVE_GAP, KEPT_GAIN) and when a quality label shows
  // (cache.ts, LABEL_VISITS). `opponent` is the site's word for the other player ("enemy" on Hedge School).
  // `afterBest` and `afterGreat` give the site's own items after Best and after Great.
  import type { Snippet } from "svelte";
  import { LABEL_VISITS } from "@abstractclass/analysis/cache.ts";
  import { KEPT_GAIN, MISTAKE_WIN, ONLY_MOVE_GAP, WIN_BANDS } from "@abstractclass/analysis/labels.ts";
  import { LABEL_TEXT } from "@abstractclass/analysis/model.ts";
  import { WHOLE } from "../game.ts";
  import { wholePct } from "./format.ts";
  let { opponent, afterBest, afterGreat }: { opponent: string; afterBest?: Snippet; afterGreat: Snippet } = $props();
</script>

<h2>The quality labels</h2>
<p>A move's <strong>loss</strong> is the mover's win chance before the move, less the mover's win chance after it,
  each from its own position's search. A move that raises the win chance loses nothing. The quality label reads the
  loss in the bands that chess.com uses for every player:</p>
<table>
  <thead><tr><th>Quality label</th><th>Win chance lost</th></tr></thead>
  <tbody>
    {#each WIN_BANDS as [label, upTo] (label)}
      <tr><td>{LABEL_TEXT[label]}</td><td>up to {wholePct(upTo)}</td></tr>
    {/each}
    <tr><td>{LABEL_TEXT.blunder}</td><td>more than {wholePct(MISTAKE_WIN)}</td></tr>
  </tbody>
</table>
<ul>
  <li><strong>Best:</strong> the engine's own first choice, whatever its loss. Two searches each have a small error,
    and the engine's own move should never read as a mistake.</li>
  {@render afterBest?.()}
  <li><strong>Great:</strong> the only good move, which keeps the gain from the {opponent}'s last turn. It is Best, and
    the engine's second choice is at least {wholePct(ONLY_MOVE_GAP)} worse. The second choice usually has few visits,
    so a search of the position after it, as deep as the position after your move, must confirm the gap. Until then
    the move is Best. Also, the engine's first choice must be more than {wholePct(KEPT_GAIN)} better for you than the
    position before the {opponent}'s last turn. An only move that only holds the position is Best. The game's last
    move is never Great: nothing after it can confirm it. The first turn is never Great: no turn of the {opponent}
    comes before it.</li>
  {@render afterGreat()}
  <li><strong>When a quality label shows:</strong> once the search of each position of the move reaches
    {WHOLE.format(LABEL_VISITS)} visits. A deeper search can change it.</li>
</ul>
<p>The move list and the chart show Great, Inaccuracy, Mistake and Blunder, to stay quiet. The board shows every
  quality label. Under a Mistake or a Blunder, the engine's best line from that position shows as a variation.</p>
