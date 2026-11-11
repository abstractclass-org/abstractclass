<script lang="ts">
  // The game's actions in the frame's step bar (Hedge School's design 24), as Lichess's: Take back, Abort and Resign.
  // They show, off, while the bot starts, so that the bar keeps its layout, and go at the game's end. Abort and Resign
  // ask first (ConfirmEnd.svelte). `off`: a panel of the page's own is open in the side column, as Hedge School's
  // display settings. The page's own buttons follow them (`children`).
  import type { Snippet } from "svelte";
  import Icon from "@abstractclass/site/Icon.svelte";
  import type { PracticeStatus } from "./game.svelte.ts";

  const DANGER = "hover:not-disabled:text-blunder hover:not-disabled:border-blunder"; // Abort and Resign, as Lichess's

  let { game, off = false, ontakeback, onask, children }: {
    game: { status: PracticeStatus; canTakeBack: boolean } | null;
    off?: boolean;
    ontakeback: () => void;
    onask: (what: "abort" | "resign") => void; // Abort or Resign, for its confirmation
    children?: Snippet;
  } = $props();
</script>

{#if game?.status !== "over"}
  <button class="btn-icon" aria-label="Take back" title="Takeback" disabled={!game?.canTakeBack || off} onclick={ontakeback}><Icon name="takeback" /></button>
  <button class={["btn-icon", DANGER]} aria-label="Abort" title="Abort" disabled={!game || game.status === "starting" || off}
          onclick={() => onask("abort")}><Icon name="abort" /></button>
  <button class={["btn-icon", DANGER]} aria-label="Resign" title="Resign"
          disabled={!game || game.status === "starting" || game.status === "failed" || off} onclick={() => onask("resign")}><Icon name="resign" /></button>
{/if}
{@render children?.()}
