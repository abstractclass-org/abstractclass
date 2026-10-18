<script lang="ts">
  // The ask to allow Google Analytics in a blocker (design 27), in the consent banner's place and card: for a visitor
  // who accepted its cookies and whose Google tag did not run. Close keeps it closed in this browser. Its words invite,
  // as the banner's do: the site shows no ads, and the counts show what to build.
  import { closeAsk } from "#lib/analytics.svelte.ts";
  import { SITE_NAME } from "#lib/edition.ts";
  import CornerCard from "#lib/ui/CornerCard.svelte";
</script>

<CornerCard id="analytics-ask-title" title="Could you allow this site in your blocker?">
  <p>Thanks for accepting Google Analytics. An ad blocker or your browser's tracking protection still stops it here.</p>
  <p>{SITE_NAME} shows no ads. The counts show us which pages and tools people use, so we know what to build next.</p>
  <p>To allow it, turn off your blocker for this site, then reload the page.</p>
  {#snippet actions()}
    <button type="button" onclick={closeAsk}>Close</button>
    <span class="ml-auto text-muted"><a href="/privacy">Privacy</a></span>
  {/snippet}
</CornerCard>
