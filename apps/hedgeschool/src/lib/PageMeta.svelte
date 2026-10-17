<script lang="ts">
  // A page's title and description, for the browser's tab, search engines and link previews (design 23): Open Graph's
  // tags, which Discord and most sites read, and the canonical address on the live site, so that a preview address
  // or an address with a `#` counts as the page itself. `noindex` keeps a page out of search results. The layout
  // gives the tags that every page shares: the site's name and the preview image.
  import { page } from "$app/state";
  import { SITE_ORIGIN } from "#lib/edition.ts";

  let { title, description = "", noindex = false }: { title: string; description?: string; noindex?: boolean } = $props();
  const url = $derived(`${SITE_ORIGIN}${page.url.pathname}`);
</script>

<svelte:head>
  <title>{title}</title>
  {#if description}
    <meta name="description" content={description} />
    <meta property="og:description" content={description} />
  {/if}
  <meta property="og:title" content={title} />
  <meta property="og:url" content={url} />
  <link rel="canonical" href={url} />
  {#if noindex}<meta name="robots" content="noindex" />{/if}
</svelte:head>
