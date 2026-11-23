<script lang="ts">
  // Home (design 34, as Hedge School's design 22): what Mistak is, and what is here now. The review, the Analysis board
  // and Practice come with the engine (design 34, "Before the network"), and each joins this page with its work, as on
  // Cyanotype's home page. Until a replay of one of the engine's own games comes (design 34, "The pages"), the logo
  // stands where the board's scene will be. Plain web writing: the page invites.
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import Logo from "#lib/brand/Logo.svelte";
  import { ENGINE_NAME, SITE_NAME, SITE_ORIGIN } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  // What the site is, for search engines (schema.org, Hedge School's design 23): a website. The web application joins
  // it with the features.
  const STRUCTURED = [{ "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_ORIGIN}/` }];

  // What a visitor can read now.
  const WAYS = [
    { href: "/how-reviews-work", title: "How a review works", text: "How the engine will judge each move, and where each rule comes from." },
    { href: "/notation", title: "Tak's notation", text: "PTN for games and TPS for positions: the formats that the site reads and writes." },
    { href: "/about", title: "About Mistak", text: "What the site is for, its engine, and its early access." },
  ];
</script>

<PageMeta title="{SITE_NAME}: learn Tak"
          description="Learn Tak. Mistak will review the games you play on playtak.com and analyze any line, with an engine that runs in your browser." />
<svelte:head>{@html `<script type="application/ld+json">${JSON.stringify(STRUCTURED)}</script>`}</svelte:head>

<main class="box-content max-w-[1040px] mx-auto px-4 pt-8 pb-10 grid gap-12 max-sm:pt-5 max-sm:gap-9">
  <!-- The invitation and the logo, side by side from a tablet's width: the text first on a phone, the logo after. -->
  <section class="grid items-center gap-x-12 gap-y-8 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]">
    <div class="grid gap-5 justify-items-start">
      <h1 class="text-4xl max-sm:text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-balance">Get better at Tak</h1>
      <p class="max-w-[34rem] text-lg max-sm:text-base text-muted text-pretty">Bring the games you play on playtak.com,
        and see where they turned, which moves cost you, and what was better. {ENGINE_NAME}, our engine, runs in your
        browser.</p>
      <p class="max-w-[34rem] text-muted text-pretty">We are building {SITE_NAME} now. The review, the Analysis board and
        practice games against {ENGINE_NAME} come with the engine.</p>
    </div>
    <div class="justify-self-center"><Logo size={192} label="Mistak's logo: a stack of stones with a capstone on top" /></div>
  </section>

  <!-- What a visitor can read now: a quieter list, under a rule, in one row from a tablet's width. -->
  <section class="grid gap-4 pt-8 border-t border-line" aria-labelledby="ways">
    <h2 id="ways" class="text-lg font-semibold">Read while you wait</h2>
    <ul class="grid gap-x-10 gap-y-5 md:grid-cols-3">
      {#each WAYS as way (way.href)}
        <li class="grid gap-1">
          <a class="font-semibold text-ink no-underline hover:text-accent hover:underline underline-offset-4" href={way.href}>{way.title}</a>
          <p class="text-sm text-muted text-pretty">{way.text}</p>
        </li>
      {/each}
    </ul>
  </section>
</main>

<SiteFooter />
