<script lang="ts">
  // Cyanotype's logo (design 33, "The logo"): the contact print, a blueprint of four cells in the paper's white on
  // Prussian blue. One drawing at every size, the same in both themes. The drawing is in logo.ts. The favicon is the
  // logo as a file (src/lib/assets/favicon.svg).
  import { LOGO } from "./logo.ts";

  let { size = 24, label = "" }: { size?: number; label?: string } = $props();
</script>

<svg viewBox="0 0 100 100" width={size} height={size} role={label ? "img" : undefined} aria-label={label || undefined}
     aria-hidden={label ? undefined : "true"} class="flex-none">
  {#each LOGO as [tag, attrs], i (i)}
    {#if tag === "rect"}<rect {...attrs} />{:else}<path {...attrs} />{/if}
  {/each}
</svg>
