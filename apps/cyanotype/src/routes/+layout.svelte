<script lang="ts">
  // The site's frame (design 33): Hedge School's header, page area, theme, page metadata and site menu
  // (packages/site), with Cyanotype's name, links and keys. The analytics, as Hedge School's (design 33, "Analytics"),
  // and in a build that stores practice games, Hedge School's consent banner for its one purpose, the random number
  // that links the games (Hedge School's design 25).
  import "../app.css";
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { holdsGame } from "@abstractclass/import/importHash.ts";
  import { removeUnreadResults } from "@abstractclass/analysis/cache.ts";
  import { ASKS_CONSENT, analytics, consentChosen, startAnalytics, track } from "#lib/analytics.svelte.ts";
  import { flushPractice } from "#lib/practice/send.ts";
  import ConsentBanner from "@abstractclass/site/ConsentBanner.svelte";
  import favicon from "#lib/assets/favicon.svg";
  import Logo from "#lib/brand/Logo.svelte";
  import { ENGINE_FILES, ENGINE_NAME, PLACES_KEY, SITE_NAME, SITE_ORIGIN, THEME_KEY } from "#lib/site.ts";
  import SiteFrame from "@abstractclass/site/SiteFrame.svelte";
  import SiteHead from "@abstractclass/site/SiteHead.svelte";
  import SiteMenu from "@abstractclass/site/SiteMenu.svelte";
  import SiteName from "@abstractclass/site/SiteName.svelte";
  import SupportButton from "@abstractclass/site/SupportButton.svelte";
  import SupportDialog from "@abstractclass/site/SupportDialog.svelte";
  import ThemeMenu from "@abstractclass/site/ThemeMenu.svelte";

  let { children } = $props();

  // The game's pages on the header's left and the pages about the site on its right, from 900 pixels, as Hedge School's
  // (design 22). Below 900 they are in the site's menu, Tools only from 640 pixels (`wide`), since the tools are for a
  // computer's browser: the footer leads to it below 640. The others are in the footer.
  const NAV = [{ href: "/practice", label: "Practice" }, { href: "/review", label: "Review" }, { href: "/analysis", label: "Analysis" }];
  const ABOUT = [{ href: "/tools", label: "Tools", wide: true }, { href: "/notation", label: "Notation" },
                 { href: "/about", label: "About" }];
  const linkClass = (href: string) => ["no-underline hover:text-ink", page.url.pathname.startsWith(href) ? "text-ink" : "text-muted"];
  // Ko-fi's tip panel, in the site's own dialog (SupportDialog), as Hedge School's (design 33, "Support Us"). Opening
  // it counts: the tips are Ko-fi's.
  let supporting = $state(false);
  // What the tips pay for: the engine's training and the site. The Ko-fi page is Hedge School's too. The words are short,
  // so that the dialog fits a window of 1,280 × 900 with no scroll bar of its own, as Hedge School's (design 33).
  const SUPPORT_WORDS = `${SITE_NAME} is free. Tips through Ko-fi pay for ${ENGINE_NAME}'s training and the site, and ` +
    "go to the same page as Hedge School's.";
  function support() {
    supporting = true;
    track("support_open");
  }

  // The visit counts start here, unless the address holds a game after its `#` (holdsGame): the page that takes it out
  // of the address starts them then (Hedge School's design 22). The import page always takes its game out first, and
  // starts them itself. The banner shows in the browser only, never in the prerendered page.
  let mounted = $state(false);
  onMount(() => {
    mounted = true;
    if (page.route.id !== "/import" && !holdsGame(location.hash)) startAnalytics();
    void flushPractice(); // the practice games that could not be sent before (Hedge School's design 25)
    // The stored analyses that no reader reads: once after a change of their shape, and an earlier engine's that no
    // stored game needs, once after a change of the engine or of what the games need (Hedge School's design 20). The
    // removal's code loads only then, when the page is idle.
    removeUnreadResults(ENGINE_FILES, () => import("#lib/game/earlierResults.ts"));
  });
</script>

<!-- The icons, the logo (design 33, "The logo"), and the link previews' tags that every page shares (Hedge School's
     design 23). scripts/brand.mjs draws the preview picture from src/lib/brand/card.ts. -->
<SiteHead {favicon} name={SITE_NAME} origin={SITE_ORIGIN}
          imageAlt="Cyanotype: learn Blueprints. The logo, and a corner of a board with Blue's and Red's cells." />

<SiteFrame origin={SITE_ORIGIN} themeKey={THEME_KEY} placesKey={PLACES_KEY}>
  {#snippet header()}
    <!-- The logo before the name, at 28 pixels, as Hedge School's collie, and in the early access "Early Access" beside
         the name, in the accent colour, which leads to the About page's section on it (SiteName). The links and
         "Support Us" fit in one row from 900 pixels, in Linux's font too, which is wider than Windows' (design 33): the
         row needs 890 pixels in DejaVu Sans with the gaps that the links have from 940 pixels, and 858 with the
         narrower gaps below 940. Below 900, the links go into the site's menu at the left (SiteMenu), as Hedge School's
         below 1,024 pixels, and the header keeps the logo, the name, "Early Access", "Support Us" and the theme menu.
         Below 640 pixels, "Support Us" goes into the menu too, as on Hedge School. -->
    <span class="min-[900px]:hidden"><SiteMenu tabs={NAV} about={ABOUT} {support} /></span>
    <SiteName class="max-[900px]:mr-auto"><Logo size={28} />{SITE_NAME}</SiteName>
    <nav class="flex gap-2.5 min-[940px]:gap-4.5 max-[900px]:hidden">
      {#each NAV as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <nav class="flex gap-2.5 min-[940px]:gap-4.5 ml-auto text-sm max-[900px]:hidden">
      {#each ABOUT as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
    </nav>
    <SupportButton class="max-sm:hidden" onclick={support} />
    <ThemeMenu />
  {/snippet}
  {@render children()}
</SiteFrame>

<!-- The logo at 56 pixels, its full print, where Hedge School's dialog has its collie. -->
{#snippet supportMark()}<Logo size={56} />{/snippet}
<SupportDialog bind:open={supporting} site={SITE_NAME} mark={supportMark}
               description={SUPPORT_WORDS} />

<!-- The card's logo, at 48 pixels, as Hedge School's card has its collie. -->
{#snippet logo()}<Logo size={48} />{/snippet}
{#if mounted && ASKS_CONSENT && !consentChosen()}<ConsentBanner {analytics} site={SITE_NAME} title="Help Cyanotype get better" mark={logo} />{/if}
