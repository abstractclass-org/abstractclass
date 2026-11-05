<script lang="ts">
  // The site's frame (design 33): Hedge School's header, page area, theme, page metadata and site menu
  // (packages/site), with Cyanotype's name, links and keys.
  import "../app.css";
  import { page } from "$app/state";
  import { PLACES_KEY, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "#lib/site.ts";
  import SiteFrame from "@abstractclass/site/SiteFrame.svelte";
  import SiteMenu from "@abstractclass/site/SiteMenu.svelte";
  import ThemeMenu from "@abstractclass/site/ThemeMenu.svelte";

  let { children } = $props();

  // The game's pages on the header's left, as Hedge School's (design 22), from a tablet's width. The pages about the
  // site on its right: Tools from a tablet's width, since the tools are for a computer's browser, and the footer leads
  // to it on a phone. The others are in the footer.
  const NAV = [{ href: "/practice", label: "Practice" }, { href: "/review", label: "Review" }, { href: "/analysis", label: "Analysis" }];
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
    <!-- The name is the site's wordmark until its logo is decided. The links fit in one row from a tablet's width. On a
         phone, they go into the site's menu at the left (SiteMenu), as Hedge School's below 1,024 pixels, and the header
         keeps the name and the theme menu. -->
    <span class="sm:hidden"><SiteMenu tabs={NAV} about={ABOUT} /></span>
    <a class="text-xl font-bold text-ink no-underline" href="/">{SITE_NAME}</a>
    <nav class="flex gap-4.5 max-sm:hidden">
      {#each NAV as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <nav class="flex gap-4.5 ml-auto text-sm max-sm:hidden">
      {#each ABOUT as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <span class="flex items-center max-sm:ml-auto"><ThemeMenu /></span>
  {/snippet}
  {@render children()}
</SiteFrame>
