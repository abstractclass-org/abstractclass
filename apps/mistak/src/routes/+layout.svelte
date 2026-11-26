<script lang="ts">
  // The site's frame (design 34, "The site's frame"): Hedge School's and Cyanotype's header, page area, theme, page
  // metadata and site menu (packages/site), with Mistak's name, links and keys. The analytics, as both sites'. Mistak
  // stores no practice games yet, so it shows no consent banner.
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { holdsGame } from "@abstractclass/site/addressHash.ts";
  import { analytics, startAnalytics } from "#lib/analytics.svelte.ts";
  import favicon from "#lib/assets/favicon.svg";
  import Logo from "#lib/brand/Logo.svelte";
  import { ENGINE_NAME, PLACES_KEY, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "#lib/site.ts";
  import SiteFrame from "@abstractclass/site/SiteFrame.svelte";
  import SiteHead from "@abstractclass/site/SiteHead.svelte";
  import SiteMenu from "@abstractclass/site/SiteMenu.svelte";
  import SiteName from "@abstractclass/site/SiteName.svelte";
  import SupportButton from "@abstractclass/site/SupportButton.svelte";
  import SupportDialog from "@abstractclass/site/SupportDialog.svelte";
  import { Support } from "@abstractclass/site/support.svelte.ts";
  import ThemeMenu from "@abstractclass/site/ThemeMenu.svelte";

  let { children } = $props();

  // The game's pages on the header's left and the pages about the site on its right, from 900 pixels, as Cyanotype's.
  // Below 900 they are in the site's menu, Tools only from 640 pixels (`wide`), since the tools are for a computer's
  // browser: the footer leads to it below 640. The others are in the footer. The game's other pages (Practice,
  // Analysis) join the header with the work that makes each one (design 34, "The tickets proposed"), as Cyanotype's
  // header holds them: the row then needs less than Cyanotype's, whose name is wider.
  const NAV = [{ href: "/review", label: "Review" }];
  const ABOUT = [{ href: "/tools", label: "Tools", wide: true }, { href: "/notation", label: "Notation" },
                 { href: "/about", label: "About" }];
  const linkClass = (href: string) => ["no-underline hover:text-ink", page.url.pathname.startsWith(href) ? "text-ink" : "text-muted"];
  // Ko-fi's tip panel, in the site's own dialog (SupportDialog), as on both sites. Opening it counts: the tips are
  // Ko-fi's.
  const support = new Support(analytics);
  // What the tips pay for: the engine's training and the site, as on both sites.
  const SUPPORT_WORDS = `${SITE_NAME} is free. Tips through Ko-fi train ${ENGINE_NAME} and run the site.`;

  // The visit counts start here, unless the address holds a game after its `#` (holdsGame): the page that takes it out
  // of the address starts them then (Hedge School's design 22).
  onMount(() => {
    if (!holdsGame(location.hash)) startAnalytics();
  });
</script>

<!-- The icons, the logo (design 34, "The site's frame"), and the link previews' tags that every page shares (Hedge
     School's design 23). scripts/brand.mjs draws the preview picture from src/lib/brand/card.ts. -->
<SiteHead {favicon} name={SITE_NAME} origin={SITE_ORIGIN}
          imageAlt="Mistak: learn Tak. A Tak board with flats, walls, capstones and stacks." />

<SiteFrame origin={SITE_ORIGIN} themeKey={THEME_KEY} placesKey={PLACES_KEY}>
  {#snippet header()}
    <!-- The logo before the name, at 28 pixels, as on both sites, and in the early access "Early Access" beside the
         name, in the accent colour, which leads to the About page's section on it (SiteName). Below 900 pixels, the
         links go into the site's menu at the left (SiteMenu), as Cyanotype's, and the header keeps the logo, the name,
         "Early Access", "Support Us" and the theme menu. Below 640 pixels, "Support Us" goes into the menu too. -->
    <span class="min-[900px]:hidden"><SiteMenu tabs={NAV} about={ABOUT} support={support.show} /></span>
    <SiteName class="max-[900px]:mr-auto"><Logo size={28} />{SITE_NAME}</SiteName>
    <nav class="flex gap-2.5 min-[940px]:gap-4.5 max-[900px]:hidden">
      {#each NAV as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <nav class="flex gap-2.5 min-[940px]:gap-4.5 ml-auto text-sm max-[900px]:hidden">
      {#each ABOUT as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <SupportButton onclick={support.show} />
    <ThemeMenu />
  {/snippet}
  {@render children()}
</SiteFrame>

<!-- The logo at 56 pixels, its full drawing, where Hedge School's dialog has its collie. -->
{#snippet supportMark()}<Logo size={56} />{/snippet}
<SupportDialog bind:open={support.open} site={SITE_NAME} mark={supportMark}
               description={SUPPORT_WORDS} />
