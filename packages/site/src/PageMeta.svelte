<script lang="ts">
  // A page's title and description, for the browser's tab, search engines and link previews (design 23): Open Graph's
  // tags, which Discord and most sites read, and the canonical address on the live site, so that a preview address
  // or an address with a `#` counts as the page itself. `noindex` keeps a page out of search results. The site's
  // frame gives the live site's address (SiteFrame's `origin`), and the layout the tags that every page shares: the
  // site's name and the preview image.
  import { page } from "$app/state";
  import { siteOrigin } from "./origin.ts";

  let { title, description = "", noindex = false }: { title: string; description?: string; noindex?: boolean } = $props();
  const origin = siteOrigin();
  const url = $derived(`${origin()}${page.url.pathname}`);
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
