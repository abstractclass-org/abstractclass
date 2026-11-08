<script lang="ts">
  // The consent banner (Hedge School's design 25, item 5; its design 11's banner, replaced): the site's mark asks once,
  // for each purpose that the build has, and says what each does for the site, as a visitor who declines most often
  // does not read further. Accept and Decline cover every purpose and look the same, so that declining is as easy as
  // accepting. "Choose each" leads to the privacy page's switch for each purpose. Its words promise only what holds
  // whatever the site adds later. The title is the site's own (`title`): plain web writing, which invites.
  import type { Snippet } from "svelte";
  import type { Analytics } from "./analytics.svelte.ts";
  import CornerCard from "./CornerCard.svelte";

  let { analytics, site, title, mark }: { analytics: Analytics; site: string; title: string; mark: Snippet } = $props();

  const TEXT = {
    games: "A random ID in this browser groups your games against bots, so we can tell how hard each setting is for real players.",
    analytics: "Google Analytics' cookies show which pages and tools you come back to, so that we work on those.",
  };
  const items = $derived((["games", "analytics"] as const).filter(p => analytics.purposes.includes(p)));
</script>

<CornerCard {title} {mark}>
  <p>{site} is free. If you accept, {items.length > 1 ? "two things help" : "this helps"} us improve it:</p>
  <ul class="grid gap-1.5 pl-4 list-disc">
    {#each items as p (p)}<li>{TEXT[p]}</li>{/each}
  </ul>
  <p>{#if analytics.purposes.includes("games")}Your games against bots are kept either way, never with your name.{/if}
    We never sell your data.</p>
  {#snippet actions()}
    <button type="button" onclick={() => analytics.chooseAll("granted")}>Accept</button>
    <button type="button" onclick={() => analytics.chooseAll("denied")}>Decline</button>
    <span class="ml-auto text-muted"><a href="/privacy#consent">Choose each</a> · <a href="/privacy">Privacy</a></span>
  {/snippet}
</CornerCard>
