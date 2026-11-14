<script lang="ts">
  // The page for other sites (design 33, "Partner sites", item 9), on Hedge School's (its design 18): the link that
  // sends a game here, the link to the Analysis board, the messages that save a review back to a partner site and open
  // it again from there, the buttons with the logo (its file is static/brand/cyanotype.svg, written by
  // scripts/brand.mjs), the partners' test, and what can change. The sections are shared with Hedge School's page
  // (@abstractclass/import/developers). This page gives Blueprints' parts: its games' refusals, what its reader takes,
  // its Discord, its buttons' class name and head, and its list of changes. The Discord is Hedge School's: both games
  // have the same designer and the same community, and its address is shared (@abstractclass/site/community.ts). A
  // developer asks there for a test address and to join the partner list, which is empty (game/partners.ts). The
  // examples name the live site's address, which a partner's code names. A partner tests against a deployment of the
  // branch partner_test (design 33, "Partner sites"), whose address the page does not give.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { DISCORD } from "@abstractclass/site/community.ts";
  import Intro from "@abstractclass/import/developers/Intro.svelte";
  import ReviewLink from "@abstractclass/import/developers/ReviewLink.svelte";
  import AnalysisLink from "@abstractclass/import/developers/AnalysisLink.svelte";
  import SaveBack from "@abstractclass/import/developers/SaveBack.svelte";
  import OpenAgain from "@abstractclass/import/developers/OpenAgain.svelte";
  import Buttons from "@abstractclass/import/developers/Buttons.svelte";
  import Testing from "@abstractclass/import/developers/Testing.svelte";
  import WhatCanChange from "@abstractclass/import/developers/WhatCanChange.svelte";
  import { SITE_NAME, SITE_ORIGIN } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const MESSAGES = "cyanotype"; // the messages' names (game/partners.ts)
</script>

<PageMeta title="For developers · {SITE_NAME}"
          description="Link Blueprints games to Cyanotype from your site: review and analysis links, buttons, and reviews saved back to your site." />

{#snippet discord()}<a href={DISCORD}>ask in the Discord</a>{/snippet}

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
    {#snippet partnerList()}{SITE_NAME} lists its partner sites: {@render discord()} to join the list.{/snippet}
  </SaveBack>

  <OpenAgain site={SITE_NAME} live={SITE_ORIGIN} messages={MESSAGES} />

  <Buttons site={SITE_NAME} live={SITE_ORIGIN} className="cyanotype-button" file="cyanotype.svg"
           head="the logo" withHead="with {SITE_NAME}'s logo" contrast="blue tile" />

  <Testing site={SITE_NAME} live={SITE_ORIGIN} ask={discord} />

  <WhatCanChange site={SITE_NAME} lenient="unknown tags, a placement without its capture marks, the moves without turn numbers">
    {#snippet changes()}
      <li>The first release: the link to a review, the link to the Analysis board, and the messages to save a review
        and open it again, protocol 1.</li>
    {/snippet}
  </WhatCanChange>
</main>

<SiteFooter />
