<script lang="ts">
  // Home (design 33, as Hedge School's design 22): what Cyanotype is, and the way into each tab. Practice first, as
  // Lichess's front page leads with play: a game against the bot is the quickest way to begin. Then the review, and the
  // ways in for a game played elsewhere: a game from strategyjam.org, through the tools and the import page, the
  // Analysis board and its board editor. The board plays a scene from a reviewed game, with the review's candidates and
  // labels (HomeReplay), drawn with no engine. Plain web writing: the page invites.
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import HomeReplay from "#lib/home/HomeReplay.svelte";
  import { ENGINE_NAME, SITE_NAME, SITE_ORIGIN } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  // What the site is, for search engines (schema.org, Hedge School's design 23): a website, and a web application that
  // is free.
  const STRUCTURED = [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    { "@context": "https://schema.org", "@type": "WebApplication", name: SITE_NAME, url: `${SITE_ORIGIN}/`,
      applicationCategory: "GameApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript and WebAssembly",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: "Practice games against a Blueprints engine, reviews of your games, an Analysis board and a board editor, with the engine running in the browser." },
  ];

  // The other ways in: a game played on strategyjam.org, any line, any position.
  const WAYS = [
    { href: "/tools", title: "Bring a game from strategyjam.org", text: "Add our bookmarklet or userscript to your browser. Then one click opens any game you played there in the review, or on the Analysis board." },
    { href: "/analysis", title: "The Analysis board", text: "Play any line, and the engine searches the position on screen." },
    { href: "/editor", title: "Set up a position", text: "Place each player's cells and shape their blueprints, then analyze the position on the board." },
  ];
</script>

<PageMeta title="{SITE_NAME}: learn Blueprints"
          description="Learn Blueprints, the strategy jam game. Practice against the engine at the strength you choose, review the games you play on strategyjam.org, and analyze any line, in your browser." />
<svelte:head>{@html `<script type="application/ld+json">${JSON.stringify(STRUCTURED)}</script>`}</svelte:head>

<main class="box-content max-w-[1040px] mx-auto px-4 pt-8 pb-10 grid gap-12 max-sm:pt-5 max-sm:gap-9">
  <!-- The invitation and the board, side by side from a tablet's width: the text first on a phone, the board after. -->
  <section class="grid items-center gap-x-12 gap-y-8 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
    <div class="grid gap-5 justify-items-start">
      <h1 class="text-4xl max-sm:text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-balance">Get better at Blueprints</h1>
      <p class="max-w-[34rem] text-lg max-sm:text-base text-muted text-pretty">Play {ENGINE_NAME}, our bot, at the strength
        you choose. Bring the games you play on strategyjam.org, and see where they turned, which moves cost you points,
        and what was better.</p>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-3 mt-1">
        <a class="btn-primary inline-flex items-center px-6 py-3 rounded-md text-base font-semibold no-underline border
                  hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
           href="/practice">Practice against bot</a>
        <a class="text-ink underline decoration-line underline-offset-4 hover:decoration-accent" href="/review">Review a game you played</a>
      </div>
      <p class="text-sm text-muted">No clock and nothing to install: the engine runs in your browser.</p>
    </div>
    <HomeReplay />
  </section>

  <!-- A game played on strategyjam.org, any line, any position: a quieter list, under a rule. -->
  <section class="grid gap-4 pt-8 border-t border-line" aria-labelledby="ways">
    <h2 id="ways" class="text-lg font-semibold">Or start from a game of your own</h2>
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
