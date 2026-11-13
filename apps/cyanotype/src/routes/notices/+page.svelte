<script lang="ts">
  // The notices page, as on every site (packages/site's NoticesPage.svelte, design 11), with the sounds that Cyanotype
  // ships, Hedge School's (@abstractclass/site/SoundNotices.svelte).
  import NoticesPage from "@abstractclass/site/NoticesPage.svelte";
  import SoundNotices from "@abstractclass/site/SoundNotices.svelte";
  import { ENGINE_NAME, SITE_COPYRIGHT, SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import lock from "../../../engine.lock.json" with { type: "json" };
</script>

<NoticesPage site={SITE_NAME} copyright={SITE_COPYRIGHT} engine={ENGINE_NAME} {lock}>
  {#snippet sounds()}<SoundNotices />{/snippet}
</NoticesPage>

<SiteFooter />
