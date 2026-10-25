<!-- An edge as a pill along its direction (the review's view, the game's `Shape`): a capsule in its mover's colour at
     the edge's own slope on the board (rows count from the bottom, so the screen's angle is atan2(-dy, dx)), every pill
     the same length. No published tool shows an edge's direction in a move list: this form is the site's own (design
     07). A capsule is never taller than its length at any angle, so every pill has one height and a row stays even. Its
     box is as wide as the pill turned, so a steep pill takes little width. A pass has no edge: a round dot. With a
     number (the listed line), the number stands upright at the pill's centre, a disc as wide as the pill, so it is
     always on the pill's colour. Hollow when the edge is already in the tree, as the circles are. -->
<script lang="ts">
  import type { ShapeProps } from "@abstractclass/review/game.ts";
  import { SIDE_TEXT } from "@abstractclass/site/side.ts";
  import type { Edge } from "./enclosure.ts";

  let { move: edge, player, hollow, n, class: cls }: ShapeProps<Edge> = $props();
  const turn = $derived(edge ? Math.atan2(edge[1] - edge[3], edge[2] - edge[0]) : 0);
  const thick = $derived(n === null ? 44 : 66);
  const long = $derived(edge ? 100 : thick);
  const wide = $derived((long - thick) * Math.abs(Math.cos(turn)) + thick);
  const stroke = $derived(hollow ? 9 : 0);
</script>

<span class={["relative inline-flex flex-none items-center justify-center",
              n === null ? "h-[1.15em]" : "h-[2.1em] font-sans text-[0.75em] font-bold leading-none",
              hollow ? SIDE_TEXT[player] : "text-white", cls]} style:width="{(wide / 100) * (n === null ? 1.15 : 2.1)}em">
  <!-- Not clipped: the pill's ends touch the box, and a clip at a fraction of a pixel flattens a round end. -->
  <svg class={["absolute inset-0 size-full overflow-visible", SIDE_TEXT[player]]} viewBox="{-wide / 2} -50 {wide} 100"
       aria-hidden="true">
    <rect x={(stroke - long) / 2} y={(stroke - thick) / 2} width={long - stroke} height={thick - stroke}
          rx={(thick - stroke) / 2} transform="rotate({(turn * 180) / Math.PI})"
          fill={hollow ? "none" : "currentColor"} stroke={hollow ? "currentColor" : "none"} stroke-width={stroke} />
  </svg>
  <!-- The number centred in its disc, as the view's badges centre theirs: trimmed to the digits' height (cap height to
       baseline), so that flex centring centres the digits in any font. -->
  {#if n !== null}<span class="relative"><span class="block [text-box:trim-both_cap_alphabetic]">{n}</span></span>{/if}
</span>
