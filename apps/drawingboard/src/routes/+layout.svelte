<script lang="ts">
  // The site's frame (design 33): Hedge School's header, page area, theme and page metadata (packages/site), with
  // Drawing Board's name, links and keys.
  import "../app.css";
  import { page } from "$app/state";
  import { PLACES_KEY, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "#lib/site.ts";
  import SiteFrame from "@abstractclass/site/SiteFrame.svelte";
  import ThemeMenu from "@abstractclass/site/ThemeMenu.svelte";

  let { children } = $props();

  // The pages about the site, on the header's right, as Hedge School's (design 22): Tools from a tablet's width, since
  // the tools are for a computer's browser, and the footer leads to it on a phone. The others are in the footer. The
  // game's pages (the review, the Analysis board) come on the header's left when they exist.
  const ABOUT = [{ href: "/tools", label: "Tools", wide: true }, { href: "/notation", label: "Notation" },
                 { href: "/about", label: "About" }];
  const linkClass = (href: string) => ["no-underline hover:text-ink", page.url.pathname.startsWith(href) ? "text-ink" : "text-muted"];
</script>

<svelte:head>
  <!-- Link previews (design 23): the tags that every page shares. Each page gives its title, description and address
       (PageMeta). The site has no preview image until its logo is decided (design 33, "Consequences"). -->
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary" />
</svelte:head>

<SiteFrame origin={SITE_ORIGIN} themeKey={THEME_KEY} placesKey={PLACES_KEY}>
  {#snippet header()}
    <!-- The name is the site's wordmark until its logo is decided. On a phone, the two links and the theme menu fit in
         its 360 pixels, so the header needs no menu of its own. -->
    <a class="text-xl font-bold text-ink no-underline" href="/">{SITE_NAME}</a>
    <nav class="flex gap-4.5 ml-auto text-sm">
      {#each ABOUT as item (item.href)}<a href={item.href} class={[linkClass(item.href), item.wide && "max-sm:hidden"]}>{item.label}</a>{/each}
    </nav>
    <ThemeMenu />
  {/snippet}
  {@render children()}
</SiteFrame>
