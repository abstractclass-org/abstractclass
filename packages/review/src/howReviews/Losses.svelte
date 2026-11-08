<script lang="ts">
  // A move's loss and the labels' bands, at the start of the section "The quality labels" of the sites' pages "How a
  // review works" (Hedge School's design 10): the bands of the shared labels (labels.ts, WIN_BANDS).
  import { LABEL_TEXT } from "@abstractclass/analysis/model.ts";
  import { WIN_BANDS } from "@abstractclass/analysis/labels.ts";
  const pct = (v: number) => `${Math.round(100 * v)}%`;
</script>

<p>A move's <strong>loss</strong> is the mover's win chance before the move, less the mover's win chance after it,
  each from its own position's search. A move that raises the win chance loses nothing. The quality label reads the
  loss in the bands that chess.com uses for every player:</p>
<table>
  <thead><tr><th>Quality label</th><th>Win chance lost</th></tr></thead>
  <tbody>
    {#each WIN_BANDS as [label, upTo] (label)}<tr><td>{LABEL_TEXT[label]}</td><td>up to {pct(upTo)}</td></tr>{/each}
    <tr><td>{LABEL_TEXT.blunder}</td><td>more than {pct(WIN_BANDS[WIN_BANDS.length - 1][1])}</td></tr>
  </tbody>
</table>
