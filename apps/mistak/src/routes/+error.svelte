<script lang="ts">
  // The page that SvelteKit shows in the place of a page that failed: every site's (@abstractclass/site's
  // ErrorPage.svelte and pageError.ts).
  import ErrorPage from "@abstractclass/site/ErrorPage.svelte";
  import { SITE_NAME } from "#lib/site.ts";
</script>

<ErrorPage site={SITE_NAME} />
