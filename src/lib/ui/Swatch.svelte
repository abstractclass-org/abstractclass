<script lang="ts">
  // A player's colour as a dot, beside their name. "either": half Blue, half Red, for a side not chosen yet (Practice's
  // Random, as Lichess's half-white, half-black king).
  import { SIDE_BG } from "./side.ts";

  let { player }: { player: 0 | 1 | "either" } = $props();
</script>

<span class={["inline-block flex-none size-[0.8em] rounded-full",
              player === "either" ? "bg-[linear-gradient(90deg,var(--blue)_50%,var(--red)_50%)]" : SIDE_BG[player]]}></span>
