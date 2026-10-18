<script lang="ts">
  // The consent banner (design 25, item 5; design 11's banner, replaced): the collie asks once, for each purpose that the
  // build has, and says what each does for the site, as a visitor who declines most often does not read further. Accept
  // and Decline cover every purpose and look the same, so that declining is as easy as accepting. "Choose each" leads
  // to the privacy page's switch for each purpose. Its words promise only what holds whatever the site adds later.
  import { PURPOSES, chooseAll } from "#lib/analytics.svelte.ts";
  import { SITE_NAME, STORES_PRACTICE_GAMES } from "#lib/edition.ts";
  import CornerCard from "#lib/ui/CornerCard.svelte";

  const TEXT = {
    games: "A random ID in this browser groups your games against bots, so we can tell how hard each setting is for real players.",
    analytics: "Google Analytics' cookies show which pages and tools you come back to, so that we work on those.",
  };
  const items = (["games", "analytics"] as const).filter(p => PURPOSES.includes(p));
</script>

<CornerCard id="consent-title" title="Help the school get better">
  <p>{SITE_NAME} is free. If you accept, {items.length > 1 ? "two things help" : "this helps"} us improve it:</p>
  <ul class="grid gap-1.5 pl-4 list-disc">
    {#each items as p (p)}<li>{TEXT[p]}</li>{/each}
  </ul>
  <p>{#if STORES_PRACTICE_GAMES}Your games against bots are kept either way, never with your name.{/if}
    We never sell your data.</p>
  {#snippet actions()}
    <button type="button" onclick={() => chooseAll("granted")}>Accept</button>
    <button type="button" onclick={() => chooseAll("denied")}>Decline</button>
    <span class="ml-auto text-muted"><a href="/privacy#consent">Choose each</a> · <a href="/privacy">Privacy</a></span>
  {/snippet}
</CornerCard>
