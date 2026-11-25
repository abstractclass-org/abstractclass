<script lang="ts">
  // The review page (docs/design/34-tak-site.md, item 10), as Hedge School's and Cyanotype's (design 22): the Review tab
  // (ReviewHome.svelte). Until the review exists, a game that the site takes shows its tags and its moves in the tab's
  // place (BroughtGame.svelte), and nothing is kept.
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import BroughtGame from "#lib/import/BroughtGame.svelte";
  import type { Brought } from "#lib/import/ways.ts";
  import ReviewHome from "#lib/review/ReviewHome.svelte";
  import { SITE_NAME } from "#lib/site.ts";

  let brought = $state.raw<Brought | null>(null);
</script>

<PageMeta title="Review a game · {SITE_NAME}"
          description="Bring a game of Tak: a link to a playtak game, a PTN Ninja link, or its record in PTN." />

{#if brought}
  <BroughtGame {brought}>
    <button type="button" onclick={() => (brought = null)}>Review another game</button>
  </BroughtGame>
{:else}
  <ReviewHome onbring={game => (brought = game)} />
{/if}
