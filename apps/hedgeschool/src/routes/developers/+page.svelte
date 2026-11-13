<script lang="ts">
  // The page for other sites (design 18), as Lichess's page for developers: the link that sends a game here, the
  // messages that save its review back to a partner site and open it again from there, the buttons with the collie
  // (its file is static/brand/hedge-school.svg), and what can change. The sections are shared with Cyanotype's page
  // (@abstractclass/import/developers). This page gives Hedge School's parts: its games' refusals, its Discord, its
  // buttons' style and its list of changes. The game record's notation has its own page. The examples name the live
  // site's address, which a partner's code names. A partner tests against a deployment of the branch partner_test
  // (design 18), whose address the page does not give.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Intro from "@abstractclass/import/developers/Intro.svelte";
  import ReviewLink from "@abstractclass/import/developers/ReviewLink.svelte";
  import AnalysisLink from "@abstractclass/import/developers/AnalysisLink.svelte";
  import SaveBack from "@abstractclass/import/developers/SaveBack.svelte";
  import OpenAgain from "@abstractclass/import/developers/OpenAgain.svelte";
  import Buttons from "@abstractclass/import/developers/Buttons.svelte";
  import Testing from "@abstractclass/import/developers/Testing.svelte";
  import WhatCanChange from "@abstractclass/import/developers/WhatCanChange.svelte";
  import { DISCORD, SITE_NAME, SITE_ORIGIN } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const LIVE = SITE_ORIGIN, MESSAGES = "hedge-school"; // the messages' names (game/partners.ts)
  // The partners' buttons: their style, shown on this page as it is given.
  const BUTTON_CSS = `.hedge-school-button {
  display: inline-flex; align-items: center; gap: 0.45em;
  padding: 0.35em 0.95em 0.35em 0.45em; border: 0; border-radius: 999px;
  background: #b8a6e8; color: #16181c; font: 600 15px/1.4 system-ui, sans-serif;
  text-decoration: none; cursor: pointer;
}
.hedge-school-button:hover { background: #c6b8ee; }
.hedge-school-button img { width: 1.5em; height: 1.5em; margin: 0; flex: none; }`;
</script>

<PageMeta title="For developers · {SITE_NAME}"
          description="Link Enclosure games to Hedge School from your site: review and analysis links, buttons, and reviews saved back to your site." />

{#snippet discord()}<a href={DISCORD}>ask in the Discord</a>{/snippet}

<main class={PROSE}>
  <Intro site={SITE_NAME} game="Enclosure" />

  <ReviewLink site={SITE_NAME} live={LIVE} messages={MESSAGES} moves="edges">
    {#snippet start()}
      <li><strong>The online rules from the standard start only.</strong> {SITE_NAME} refuses a record whose
        <code>Rules</code> tag has a value, or whose <code>Position</code> tag gives a start other than the standard
        start. A message says why. In either tag, {SITE_NAME} reads <code>?</code> or <code>-</code> as no value. Show
        the link for refused games only once {SITE_NAME} reviews them.</li>
    {/snippet}
  </ReviewLink>

  <AnalysisLink live={LIVE} moves="edges" />

  <SaveBack site={SITE_NAME} live={LIVE} messages={MESSAGES}>
    {#snippet list()}{SITE_NAME} lists its partner sites: {@render discord()} to join the list.{/snippet}
  </SaveBack>

  <OpenAgain site={SITE_NAME} live={LIVE} messages={MESSAGES} />

  <Buttons site={SITE_NAME} live={LIVE} className="hedge-school-button" css={BUTTON_CSS} file="hedge-school.svg"
           head="the collie" withHead="with the school's collie">
    {#snippet headItem()}
      <li><strong>The collie:</strong> <a href="/brand/hedge-school.svg" download>hedge-school.svg</a>. It is
        {SITE_NAME}'s. Use it, unchanged but for its size, only in a button or a link that leads to {SITE_NAME}. Serve
        it from your own site. Its white outline keeps it clear on light and dark pages alike.</li>
    {/snippet}
  </Buttons>

  <Testing site={SITE_NAME} live={LIVE} ask={discord} />

  <WhatCanChange site={SITE_NAME} lenient="unknown tags, an edge's points in either order, lower case">
    {#snippet changes()}
      <li>2026-10-13: the link, and the messages to save and open a review, protocol 1.</li>
      <li>2026-10-14: the links go to <code>/review</code>, and to <code>/analysis</code> for the Analysis board. The
        old <code>/import</code> forwards to <code>/review</code>. The Analysis board takes <code>position</code>.</li>
      <li>2026-10-19: the link to a review is <code>/import#record=…</code> again, with or without
        <code>save</code>. <code>/review#record=…</code> no longer opens a game. The link that opens a kept review
        again stays <code>/review#from=…</code>.</li>
    {/snippet}
  </WhatCanChange>
</main>

<SiteFooter />
