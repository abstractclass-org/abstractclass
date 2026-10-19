<script lang="ts">
  // The ask to allow Google Analytics in a blocker (design 27), in the consent banner's place and card: for a visitor
  // who accepted its cookies and whose Google tag did not run. Close keeps it closed in this browser. Its words invite,
  // as the banner's do: the site shows no ads, and Google Analytics shows what to build. A failed network load also
  // shows the card, so its words do not say for certain that a blocker stopped the tag.
  import { closeAsk } from "#lib/analytics.svelte.ts";
  import { SITE_NAME } from "#lib/edition.ts";
  import CornerCard from "#lib/ui/CornerCard.svelte";
</script>

<CornerCard title="Could you allow this site in your blocker?">
  <p>Thanks for accepting Google Analytics. It looks like an ad blocker or your browser's tracking protection is blocking
    it on this site.</p>
  <p>{SITE_NAME} shows no ads. Google Analytics tells us which pages and tools people use, so we know what to build
    next.</p>
  <p>To allow it, turn off your ad blocker or tracking protection for this site, then reload the page.</p>
  {#snippet actions()}
    <button type="button" onclick={closeAsk}>Close</button>
    <span class="ml-auto text-muted"><a href="/privacy">Privacy</a></span>
  {/snippet}
</CornerCard>
