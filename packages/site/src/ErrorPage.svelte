<script lang="ts">
  // Each site's error page (pageError.ts), in the site's frame: SvelteKit shows it in the place of a page that failed.
  // Its line tells the player what failed and its link or button what to do. The button loads the page again, as the
  // load notice's does (loadNotice.ts). The page stays out of search results.
  import { page } from "$app/state";
  import PageMeta from "./PageMeta.svelte";
  import { LOAD_NOTICE } from "./loadNotice.ts";
  import { HOME_ACTION, errorLine } from "./pageError.ts";
  import { PROSE } from "./prose.ts";

  let { site }: { /** The site's name, for the page's title. */ site: string } = $props();
  const line = $derived(errorLine(page.status, page.error));
</script>

<PageMeta title="{line.title} · {site}" noindex />

<main class={PROSE} data-error-page>
  <h1>{line.text}</h1>
  {#if line.action === "reload"}
    <p><button class="btn-primary" type="button" onclick={() => location.reload()}>{LOAD_NOTICE.action}</button></p>
  {:else}
    <p><a href="/">{HOME_ACTION}</a></p>
  {/if}
</main>
