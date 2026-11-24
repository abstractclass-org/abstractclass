<script lang="ts">
  // Mistak's logo (design 34, "The site's frame"): a stack of flat stones under a capstone, the lowest one
  // drifting off into a mist, cream on a dark pine tile. The full drawing from 48 pixels up, and below that the
  // simple drawing, which reads at 16 pixels. The same in both themes. The drawings are in logo.ts. The favicon is
  // the simple drawing as a file (src/lib/assets/favicon.svg). The mist is a gradient, so each logo of a page has
  // an id of its own for it ($props.id(), the same in the prerendered page and in the browser).
  import { drawingMarkup } from "@abstractclass/site/brandGradient.ts";
  import { logoAt } from "./logo.ts";

  let { size = 24, label = "" }: { size?: number; label?: string } = $props();
  const id = $props.id();
</script>

<svg viewBox="0 0 100 100" width={size} height={size} role={label ? "img" : undefined} aria-label={label || undefined}
     aria-hidden={label ? undefined : "true"} class="flex-none">{@html drawingMarkup(logoAt(size), id)}</svg>
