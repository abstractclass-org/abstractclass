<script lang="ts">
  // Cyanotype's logo (design 33, "The logo"): the start's blueprint, a star in its ring of six cells, white on Prussian
  // blue. The full print from 48 pixels up, and below that the simple drawing, which reads at 16 pixels. The same in
  // both themes. The drawings are in logo.ts. The favicon is the simple drawing as a file (src/lib/assets/favicon.svg).
  import { logoAt } from "./logo.ts";

  let { size = 24, label = "" }: { size?: number; label?: string } = $props();
  const shapes = $derived(logoAt(size));
</script>

<svg viewBox="0 0 100 100" width={size} height={size} role={label ? "img" : undefined} aria-label={label || undefined}
     aria-hidden={label ? undefined : "true"} class="flex-none">
  {#each shapes as [tag, attrs], i (i)}
    {#if tag === "rect"}<rect {...attrs} />{:else}<path {...attrs} />{/if}
  {/each}
</svg>
