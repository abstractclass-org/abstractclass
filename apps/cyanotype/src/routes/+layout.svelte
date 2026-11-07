<script lang="ts">
  // The site's frame (design 33): Hedge School's header, page area, theme, page metadata and site menu
  // (packages/site), with Cyanotype's name, links and keys.
  import "../app.css";
  import { page } from "$app/state";
  import favicon from "#lib/assets/favicon.svg";
  import Logo from "#lib/brand/Logo.svelte";
  import { PLACES_KEY, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "#lib/site.ts";
  import SiteFrame from "@abstractclass/site/SiteFrame.svelte";
  import SiteMenu from "@abstractclass/site/SiteMenu.svelte";
  import SiteName from "@abstractclass/site/SiteName.svelte";
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
  <!-- The logo (design 33, "The logo"): a PNG for browsers without SVG icons, the SVG for the rest, and a square tile for
       iOS. -->
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href={favicon} type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <!-- Link previews (design 23): the tags that every page shares. Each page gives its title, description and address
       (PageMeta). The image is drawn by scripts/brand.mjs from src/lib/brand/card.ts. -->
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="{SITE_ORIGIN}/brand/card.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Cyanotype: learn Blueprints. The logo, and a corner of a board with Blue's and Red's cells." />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<SiteFrame origin={SITE_ORIGIN} themeKey={THEME_KEY} placesKey={PLACES_KEY}>
  {#snippet header()}
    <!-- The logo before the name, at 28 pixels, as Hedge School's collie, and in the early access "Early Access" beside
         the name, in the accent colour, which leads to the About page's section on it (SiteName). The links fit in one
         row from a tablet's width. On a phone, they go into the site's menu at the left (SiteMenu), as Hedge School's
         below 1,024 pixels, and the header keeps the logo, the name, "Early Access" and the theme menu. -->
    <span class="sm:hidden"><SiteMenu tabs={NAV} about={ABOUT} /></span>
    <SiteName class="max-sm:mr-auto"><Logo size={28} />{SITE_NAME}</SiteName>
    <nav class="flex gap-4.5 max-sm:hidden">
      {#each NAV as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <nav class="flex gap-4.5 ml-auto text-sm max-sm:hidden">
      {#each ABOUT as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <ThemeMenu />
  {/snippet}
  {@render children()}
</SiteFrame>
