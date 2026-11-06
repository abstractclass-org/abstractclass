<script lang="ts">
  // What the site keeps, and where (design 11), in Hedge School's words: what the browser keeps, the games that come
  // in an address, and the visits. No analytics yet. The section on addresses follows Cyanotype's code: the tools'
  // import address (@abstractclass/import/bookmarklet.ts and userscript.ts), the import page's version check
  // (routes/import), and the share links (game/share.ts, game/board.ts).
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Cyanotype keeps in your browser. It has no accounts, no analytics and no cookies." />

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts, no analytics, no cookies and no server of its own. The engine runs in your browser,
    so your games and their reviews stay on your computer.</p>

  <h2>What your browser keeps</h2>
  <p>Your browser keeps the games that you review, with their reviews and analyses. It also keeps your work on the
    Analysis board, the practice game in progress, your settings and your choices. They stay in this browser on this
    computer. To delete them, clear this site's data in your browser's settings.</p>

  <h2>Games in an address</h2>
  <p>The bookmarklet and the userscript bring a game from strategyjam.org after the <code>#</code> in the address of
    this site's import page. A link that shares a review or an analysis carries it in the same way. Browsers never send
    that part of an address to a server, so Cloudflare does not receive the game. Each page removes it from the address
    at once. Anyone who has a share link can open what it holds.</p>
  <p>With each game, the bookmarklet and the userscript tell this site which tool sent it, its version, the game's site
    and the position that the game's page showed. With the version, this site can tell you when a tool needs an
    update.</p>
  <p>A link that shares a review holds the game's record, with its tags, such as the players' names, and the moves of
    your variations. It also names the engine, the network and the depth of your review. A link that shares an analysis
    holds the lines of your Analysis board and the position on screen.</p>

  <h2>Visits</h2>
  <p><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP address
    and your browser's name. The site counts no visits.</p>
</main>

<SiteFooter />
