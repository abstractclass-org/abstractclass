<script lang="ts">
  // The page for other sites (design 34, "The pages"). Hedge School's and Cyanotype's pages give the link that sends a
  // game to the review, the link to the Analysis board, the messages that save a review back to a partner site and the
  // buttons, from the shared sections (@abstractclass/import/developers). Mistak takes no game yet: its import, with a
  // game in PTN, comes with abscls-shfz.18.7. The shared sections describe a record in Hedge School's form (its
  // tags `Blue` and `Red`), so this page waits for that work to give Tak's parts. Until then it says what comes, and
  // where the other sites describe it now.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="For developers · {SITE_NAME}"
          description="How a Tak site will send its games to Mistak for review, with links, buttons and reviews saved back to it." />

<main class={PROSE}>
  <h1>For developers</h1>
  <p>A site where people play Tak will be able to send its games to {SITE_NAME} for review, or to its Analysis board,
    and a partner site will be able to keep the reviews and open them again. The game goes as a record in PTN,
    <a href="/notation">Tak's notation</a>.</p>
  <p>{SITE_NAME} takes no game yet. The links, the messages and the buttons come with its import, and this page then
    describes them. They work as on the two other sites, Hedge School and Cyanotype:
    <a href="https://hedgeschool.abstractclass.org/developers">Hedge School's page for developers</a> describes them
    now.</p>
</main>

<SiteFooter />
