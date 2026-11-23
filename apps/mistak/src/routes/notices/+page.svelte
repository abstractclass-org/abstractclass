<script lang="ts">
  // The notices page, as on every site (packages/site's NoticesPage.svelte, design 11). Mistak ships no engine release
  // yet (design 34, "Before the network"), so it gives no engine lock: the page then lists the site's own terms and the
  // works of others that its pages ship. The engine's terms join it with the engine's files, and the sounds' notices
  // with the move sounds (design 34, "The sounds").
  import NoticesPage from "@abstractclass/site/NoticesPage.svelte";
  import { ENGINE_NAME, SITE_COPYRIGHT, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<NoticesPage site={SITE_NAME} copyright={SITE_COPYRIGHT} engine={ENGINE_NAME} />

<SiteFooter />
