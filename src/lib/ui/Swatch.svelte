<script lang="ts">
  // A player's colour as a dot, beside their name.
  import { SIDE_BG } from "./side.ts";

  let { player }: { player: 0 | 1 } = $props();
</script>

<span class="inline-block flex-none size-[0.8em] rounded-full {SIDE_BG[player]}"></span>
