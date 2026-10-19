<script lang="ts">
  // Home (design 22): what Hedge School is, and the way into each tab. Practice first, as Lichess's front page leads
  // with play: a game against the bot is the quickest way to begin, and its review is one click from its end. Then the
  // ways in for a game played elsewhere: the Review tab, the Analysis board and its board editor. In the full site,
  // the daily puzzle and the next lesson too. The board plays scenes from reviewed games, with the review's candidates
  // and labels (HomeReplay), drawn with no engine.
  import Board from "#lib/board/Board.svelte";
  import { review, PLAYER_NAME } from "#lib/review/enclosure.ts";
  import { puzzlesFrom } from "#lib/puzzles/model.ts";
  import { COURSE } from "#lib/learn/lessons.ts";
  import { EARLY_ACCESS, SITE_NAME, SITE_ORIGIN } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import { SAMPLE } from "#lib/mock/sample.ts";
  import PageMeta from "#lib/PageMeta.svelte";
  import HomeReplay from "#lib/home/HomeReplay.svelte";

  const R = review(SAMPLE);
  const daily = puzzlesFrom(R)[0];
  const firstLesson = COURSE[0].lessons[0];

  // What the site is, for search engines (schema.org, design 23): a website, and a web application that is free.
  const STRUCTURED = [
    { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    { "@context": "https://schema.org", "@type": "WebApplication", name: SITE_NAME, url: `${SITE_ORIGIN}/`,
      applicationCategory: "GameApplication", operatingSystem: "Any", browserRequirements: "Requires JavaScript and WebAssembly",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: "Practice games against an Enclosure engine, reviews of your games, an analysis board and a board editor, with the engine running in the browser." },
  ];

  // The other ways in: a game played elsewhere, any line, any position.
  const WAYS = [
    { href: "/review", title: "Review a game you played", text: "Bring its record, and the engine judges each move: where it turned, and what was better." },
    { href: "/analysis", title: "The Analysis board", text: "Play any line, and the engine searches the position on screen." },
    { href: "/editor", title: "Set up a position", text: "Place each player's edges, then analyze the position on the board." },
  ];
  const CARD = "grid gap-1.5 px-4 py-3.5 bg-panel border border-line rounded-lg text-ink no-underline hover:border-accent";
</script>

<PageMeta title="{SITE_NAME}: learn Enclosure"
          description="Learn Enclosure, the game of edges and enclosed regions. Practice against the engine at the strength you choose, review your games, and analyze any position, in your browser." />
<svelte:head>{@html `<script type="application/ld+json">${JSON.stringify(STRUCTURED)}</script>`}</svelte:head>

<main class="box-content max-w-[1040px] mx-auto px-4 pt-8 pb-10 grid gap-12 max-sm:pt-5 max-sm:gap-9">
  <!-- The invitation and the board, side by side from a tablet's width: the text first on a phone, the board after. -->
  <section class="grid items-center gap-x-12 gap-y-8 md:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
    <div class="grid gap-5 justify-items-start">
      <h1 class="text-4xl max-sm:text-3xl font-bold leading-[1.1] tracking-[-0.02em] text-balance">Get better at Enclosure</h1>
      <p class="max-w-[34rem] text-lg max-sm:text-base text-muted text-pretty">Play the bot at the strength you choose, then
        see where your game turned, which edges cost you, and what was better.</p>
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

  <!-- A game played elsewhere, any line, any position: a quieter list, under a rule. -->
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

  {#if !EARLY_ACCESS}
  <div class="grid grid-cols-[repeat(auto-fit,minmax(16rem,1fr))] items-start gap-3">
    <a class={CARD} href="/puzzles">
      <strong>Daily puzzle</strong>
      <div class="rounded overflow-hidden"><Board position={R.data.positions[daily.index]} layers={{ candidates: false, marks: false, coordinates: false }} /></div>
      <span class="text-sm text-muted">{PLAYER_NAME[daily.player]} to play. Find the only good edge.</span>
    </a>

    <a class={CARD} href="/learn">
      <strong>Start with “{firstLesson.title}”</strong>
      <span class="text-sm text-muted">{COURSE[0].title}: {COURSE[0].lessons.length} short lessons on the board.</span>
    </a>
  </div>
  {/if}
</main>

<SiteFooter />
