<!-- A label's badge: its fill as a disc and its mark in white (LabelMark.svelte), as chess.com's move list and the
     report show a label, and as Lichess's board shows a glyph. A little wider than the text's capitals, so that it
     fits a line of the move list without making it taller. The disc fills its square, so the square does not clip:
     a badge that falls on half a pixel would lose its edge's last row. -->
<script lang="ts">
  import LabelMark from "./LabelMark.svelte";
  import type { Label } from "@abstractclass/analysis/labels.ts";

  let { label }: { label: Label } = $props();
</script>

<svg class="inline-block flex-none size-[1.2em] align-[-0.24em] overflow-visible" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="12" fill="var(--{label}-fill)" />
  <LabelMark {label} />
</svg>
