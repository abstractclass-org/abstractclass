<script lang="ts">
  // The notices page, as on every site (packages/site's NoticesPage.svelte, design 11), with the sounds that Hedge
  // School ships (@abstractclass/site/SoundNotices.svelte).
  import NoticesPage from "@abstractclass/site/NoticesPage.svelte";
  import SoundNotices from "@abstractclass/site/SoundNotices.svelte";
  import { SITE_COPYRIGHT, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import lock from "../../../engine.lock.json" with { type: "json" };
</script>

<NoticesPage site={SITE_NAME} copyright={SITE_COPYRIGHT} engine="HedgeFund" {lock}>
  {#snippet sounds()}<SoundNotices />{/snippet}
</NoticesPage>

<SiteFooter />
