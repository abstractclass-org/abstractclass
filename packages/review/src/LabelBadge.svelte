<!-- A label's badge: its fill as a disc and its mark in white (LabelMark.svelte), as chess.com's move list and the
     report show a label, and as Lichess's board shows a glyph. A little wider than the text's capitals, so that it
     fits a line of the move list without making it taller. The disc fills its square, so the square does not clip:
     a badge that falls on half a pixel would lose its edge's last row. A book move's badge in the move list (design 32,
     item 4) has the book's brown as its disc (`fill`), or an open book in white in the place of its quality mark (`book`): the
     icon's book, two thirds of its size and its stroke a little heavier, so that it reads at the badge's size. -->
<script lang="ts">
  import LabelMark from "./LabelMark.svelte";
  import { BOOK_PATH } from "@abstractclass/site/Icon.svelte";
  import type { Label } from "@abstractclass/analysis/labels.ts";

  let { label, fill = `var(--${label}-fill)`, book = false }: { label: Label; fill?: string; book?: boolean } = $props();
</script>

<svg class="inline-block flex-none size-[1.2em] align-[-0.24em] overflow-visible" viewBox="0 0 24 24" aria-hidden="true">
  <circle cx="12" cy="12" r="12" {fill} />
  {#if book}
    <path d={BOOK_PATH} transform="translate(12 12.5) scale(0.66) translate(-12 -12.5)" fill="none" stroke="var(--on-badge)"
          stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  {:else}
    <LabelMark {label} />
  {/if}
</svg>
