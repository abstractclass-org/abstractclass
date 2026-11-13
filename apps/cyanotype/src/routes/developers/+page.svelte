<script lang="ts">
  // The page for other sites (design 33, "Partner sites", item 9), on Hedge School's (its design 18): the link that
  // sends a game here, the link to the Analysis board, the messages that save a review back to a partner site and open
  // it again from there, and what can change. The sections are shared with Hedge School's page
  // (@abstractclass/import/developers). This page gives Blueprints' parts: its games' refusals and what its reader
  // takes. The buttons, the partners' test and the list of changes come with Cyanotype's head for the buttons
  // (abscls-8tl1.77). The partner list is empty (game/partners.ts). The examples name the live site's address, which a
  // partner's code names.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Intro from "@abstractclass/import/developers/Intro.svelte";
  import ReviewLink from "@abstractclass/import/developers/ReviewLink.svelte";
  import AnalysisLink from "@abstractclass/import/developers/AnalysisLink.svelte";
  import SaveBack from "@abstractclass/import/developers/SaveBack.svelte";
  import OpenAgain from "@abstractclass/import/developers/OpenAgain.svelte";
  import WhatCanChange from "@abstractclass/import/developers/WhatCanChange.svelte";
  import { SITE_NAME, SITE_ORIGIN } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const MESSAGES = "cyanotype"; // the messages' names (game/partners.ts)
</script>

<PageMeta title="For developers · {SITE_NAME}"
          description="Link Blueprints games to Cyanotype from your site: review and analysis links, and reviews saved back to your site." />

<main class={PROSE}>
  <Intro site={SITE_NAME} game="Blueprints" />

  <ReviewLink site={SITE_NAME} live={SITE_ORIGIN} messages={MESSAGES} moves="moves">
    {#snippet refusals()}
      <li><strong>The standard start only.</strong> {SITE_NAME} refuses a record whose <code>Position</code> tag gives
        a start other than the standard start. A message says why. {SITE_NAME} reads <code>?</code> or <code>-</code>
        in the tag as no value. Send a game from another start to the Analysis board. The engine's rules also check
        each move and its capture marks.</li>
    {/snippet}
  </ReviewLink>

  <AnalysisLink live={SITE_ORIGIN} moves="moves" />

  <SaveBack site={SITE_NAME} live={SITE_ORIGIN} messages={MESSAGES}>
    {#snippet partnerList()}{SITE_NAME} lists its partner sites, and has none yet.{/snippet}
  </SaveBack>

  <OpenAgain site={SITE_NAME} live={SITE_ORIGIN} messages={MESSAGES} />

  <WhatCanChange site={SITE_NAME} lenient="unknown tags, a placement without its capture marks, the moves without turn numbers" />
</main>

<SiteFooter />
