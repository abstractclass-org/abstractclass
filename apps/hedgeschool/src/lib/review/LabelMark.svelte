<svelte:options namespace="svg" />

<!-- A label's mark (labelShapes.ts) in white, on its 24-unit square: inside a badge (LabelBadge.svelte) and on the
     board's badges (Board.svelte). -->
<script lang="ts">
  import { LABEL_SHAPES } from "./labelShapes.ts";
  import type { Label } from "@abstractclass/analysis/labels.ts";

  let { label, transform = undefined }: { label: Label; transform?: string } = $props();
</script>

<g {transform} fill="var(--on-badge)" stroke="var(--on-badge)">
  {#each LABEL_SHAPES[label] as s, i (i)}
    {#if s.kind === "stroke"}
      <path d={s.d} fill="none" stroke-width={s.w} stroke-linecap="butt" stroke-linejoin={s.round ? "round" : "miter"} transform={s.t} />
    {:else if s.kind === "fill"}
      <path d={s.d} stroke-width={s.round} stroke-linejoin="round" transform={s.t} />
    {:else}
      <rect x={s.x} y={s.y} width={s.width} height={s.height} rx={s.r} stroke="none" transform={s.t} />
    {/if}
  {/each}
</g>
