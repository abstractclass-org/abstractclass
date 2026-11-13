<script lang="ts">
  // The section "A link to a review" of the sites' pages for developers (Hedge School's design 18, items 1 to 3): the
  // link that sends a finished game to the import page (importHash.ts), with a partner's save page. `live` is the live
  // site's address, which a partner's code names, and `messages` the start of the site's messages' names
  // (partners.ts), which the save page's example address also takes. `moves` is the site's word for a game's moves
  // ("edges" on Hedge School). `start` is the item on the games that the site refuses: a start or rules of their own.
  import type { Snippet } from "svelte";
  let { site, live, messages, moves, start }:
    { site: string; live: string; messages: string; moves: string; start: Snippet } = $props();
  const link = $derived(`const link = "${live}/import#" + new URLSearchParams({ record });
// with a save page, for a partner site:
const link = "${live}/import#" + new URLSearchParams({ record, save: "https://example.com/${messages}/save?game=123" });`);
</script>

<h2 id="link">A link to a review</h2>
<p>One link sends a finished game here. {site} keeps the game in the player's browser and opens its review.</p>
<pre>{link}</pre>
<ul>
  <li><strong><code>record</code>:</strong> the game, as a game record in the notation, or a plain list of {moves}.
    URL-encode it, as <code>URLSearchParams</code> does.</li>
  <li><strong>Tags are welcome,</strong> but the link needs none: <code>Blue</code> and <code>Red</code> name the
    players, and <code>Date</code>, <code>Result</code> and <code>TimeControl</code> describe the game. Put the
    game's own page in <code>Site</code> (as Lichess does), and the review links back to it.</li>
  {@render start()}
  <li><strong>A finished game only.</strong> A link to a game in play would give a player the engine's help.</li>
  <li>The record goes after the <code>#</code>, which a browser never sends to a server, and the page removes it
    from the address at once.</li>
</ul>
