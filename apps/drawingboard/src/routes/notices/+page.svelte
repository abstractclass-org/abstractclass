<script lang="ts">
  // The site's own terms, then the licences of what the site ships of others' work (design 11): the libraries in the
  // pages. The engine's terms come with the engine.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import LibraryNotices from "@abstractclass/site/LibraryNotices.svelte";
  import { SITE_COPYRIGHT, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="Notices · {SITE_NAME}" description="The licences of the works that Drawing Board uses." />

<main class={PROSE}>
  <h1>Notices</h1>

  <h2>{SITE_NAME}</h2>
  <p>{SITE_NAME}'s own code, text and design are {SITE_COPYRIGHT}. All rights reserved.</p>
  <p>The other works below are by others. Their licences cover those works only, not {SITE_NAME}.</p>

  <LibraryNotices />
</main>

<SiteFooter />
