<script lang="ts">
  // The import page (design 22): every game that comes in from outside, after the `#` (importHash.ts), in the arrival
  // step (Arrival.svelte). A game from the bookmarklet or the userscript asks the player to review it or to analyze it
  // on the board (design 21). Another site's link (`record=`, with a partner's `save=`, design 18) keeps the game and
  // opens its review at once. The arrival step also takes the review's own ways in here, as a partner's older link
  // can name this page (`from=`). The page alone goes to the tools. The layout starts no analytics here: the arrival
  // step starts them once the game has left the address.
  import { onMount } from "svelte";
  import { holdsGame } from "#lib/game/importHash.ts";
  import Arrival from "#lib/review/Arrival.svelte";
  import PageMeta from "#lib/PageMeta.svelte";

  let arriving = $state(false);
  onMount(() => {
    if (holdsGame(location.hash)) arriving = true;
    else location.replace("/tools");
  });
</script>

<PageMeta title="Hedge School" noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

{#if arriving}
  <Arrival />
{:else}
  <p class="box-content max-w-184 mx-auto my-6 px-4 text-muted">Opening Hedge School…</p>
{/if}
