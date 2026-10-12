<script lang="ts">
  // The school's collie (design 12): a Border Collie's head and chest in profile, in black and white, as Lichess draws
  // its knight. Two drawings of the same dog: the head and chest from 48 pixels up, and below that the head alone, in
  // broad shapes that read at 16 pixels. The full drawing: on a light page the coat takes the text's colour and the fur
  // is the page. On a dark page the coat stays near-black and the fur white, with a light keyline round the dog, so that
  // it never turns into a negative. The head: black and white with a thick white outline, the same on both pages. The
  // paths are in collie.ts. The favicon is the head as a file (src/lib/assets/favicon.svg).
  import * as C from "./collie.ts";
  let { size = 24, label = "" }: { size?: number; label?: string } = $props();
  const small = $derived(size < 48);
</script>

{#snippet drawing(viewBox: string, cls: string, paths: [string, string][])}
  <svg {viewBox} width={size} height={size} role={label ? "img" : undefined} aria-label={label || undefined}
       aria-hidden={label ? undefined : "true"} class={["flex-none", cls]} fill-rule="evenodd">
    {#each paths as [fill, d] (fill)}<path class={fill} {d} />{/each}
  </svg>
{/snippet}

{#if small}
  {@render drawing(C.HEAD_VIEWBOX, "", [["fill-white", C.HEAD_SILHOUETTE], ["fill-[#0b0c0e]", C.HEAD_COAT]])}
{:else}
  {@render drawing(C.COLLIE_VIEWBOX, "dark:hidden", [["fill-ink", `${C.COLLIE_BODY} ${C.COLLIE_FUR}`]])}
  {@render drawing(C.COLLIE_VIEWBOX, "hidden dark:block", [["fill-[#c9cacd]", C.COLLIE_SILHOUETTE], ["fill-[#0b0c0e]", C.COLLIE_BODY], ["fill-[#f2f2f2]", C.COLLIE_FUR]])}
{/if}
