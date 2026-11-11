<script lang="ts">
  // The site's frame (design 33): Hedge School's header, page area, theme, page metadata and site menu
  // (packages/site), with Cyanotype's name, links and keys. The analytics, as Hedge School's (design 33, "Analytics"),
  // with no consent banner: Cyanotype asks for no consent.
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { holdsGame } from "@abstractclass/import/importHash.ts";
  import { removeUnreadResults } from "@abstractclass/analysis/cache.ts";
  import { startAnalytics } from "#lib/analytics.svelte.ts";
  import favicon from "#lib/assets/favicon.svg";
  import Logo from "#lib/brand/Logo.svelte";
  import { ENGINE_FILES, PLACES_KEY, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "#lib/site.ts";
  import SiteFrame from "@abstractclass/site/SiteFrame.svelte";
  import SiteHead from "@abstractclass/site/SiteHead.svelte";
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

  // The visit counts start here, unless the address holds a game after its `#` (holdsGame): the page that takes it out
  // of the address starts them then (Hedge School's design 22). The import page always takes its game out first, and
  // starts them itself.
  onMount(() => {
    if (page.route.id !== "/import" && !holdsGame(location.hash)) startAnalytics();
    // The stored analyses that no reader reads: once after a change of their shape, and an earlier engine's that no
    // stored game needs, once after a change of the engine or of what the games need (Hedge School's design 20). The
    // removal's code loads only then, when the page is idle.
    removeUnreadResults(ENGINE_FILES, () => import("#lib/game/earlierResults.ts"));
  });
</script>

<!-- The icons, the logo (design 33, "The logo"), and the link previews' tags that every page shares (Hedge School's
     design 23). The preview picture is drawn by scripts/brand.mjs from src/lib/brand/card.ts. -->
<SiteHead {favicon} name={SITE_NAME} origin={SITE_ORIGIN}
          imageAlt="Cyanotype: learn Blueprints. The logo, and a corner of a board with Blue's and Red's cells." />

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

