<script lang="ts">
  // The page for other sites (design 18), as Lichess's page for developers: the link that sends a game here, the
  // messages that save its review back to a partner site and open it again from there, the buttons with the collie
  // (its file is static/brand/hedge-school.svg), and what can change. The game
  // record's notation has its own page. The examples name the live site's address, which a partner's code names. A
  // partner tests against a deployment of the branch partner_test (design 18), whose address the page does not give.
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME, SITE_ORIGIN } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "#lib/PageMeta.svelte";

  const LIVE = SITE_ORIGIN;
  const LINK = `const link = "${LIVE}/import#" + new URLSearchParams({ record });
// with a save page, for a partner site:
const link = "${LIVE}/import#" + new URLSearchParams({ record, save: "https://example.com/hedge-school/save?game=123" });`;
  const ANALYSIS = `const link = "${LIVE}/analysis#" + new URLSearchParams({ record });
// opened at the position after the first 12 edges:
const link = "${LIVE}/analysis#" + new URLSearchParams({ record, at: "12" });`;
  const SAVE = `// On the partner's save page, which Hedge School opened:
const HEDGE_SCHOOL = "${LIVE}";
window.addEventListener("message", async event => {
  if (event.origin !== HEDGE_SCHOOL || event.source !== window.opener) return;
  if (event.data?.type !== "hedge-school:review") return;
  await store(event.data.review); // the review file, for the signed-in player's game
  window.opener.postMessage({ type: "hedge-school:saved" }, HEDGE_SCHOOL);
});
window.opener?.postMessage({ type: "hedge-school:ready" }, HEDGE_SCHOOL);`;
  // The partners' buttons: their style, shown on this page as it is given, and their markup.
  const BUTTON_CSS = `.hedge-school-button {
  display: inline-flex; align-items: center; gap: 0.45em;
  padding: 0.35em 0.95em 0.35em 0.45em; border: 0; border-radius: 999px;
  background: #b8a6e8; color: #16181c; font: 600 15px/1.4 system-ui, sans-serif;
  text-decoration: none; cursor: pointer;
}
.hedge-school-button:hover { background: #c6b8ee; }
.hedge-school-button img { width: 1.5em; height: 1.5em; margin: 0; flex: none; }`;
  const BUTTONS = `<!-- On a finished game: a link, made as "A link to a review" shows. -->
<a class="hedge-school-button" href="${LIVE}/import#record=…" target="_blank">
  <img src="hedge-school.svg" alt=""> Review in Hedge School
</a>
<!-- Where space is short: the collie names the site, and the full label is the name that screen readers say. -->
<a class="hedge-school-button" href="${LIVE}/import#record=…" target="_blank"
   aria-label="Review in Hedge School" title="Review in Hedge School">
  <img src="hedge-school.svg" alt=""> Review
</a>

<!-- On a saved review: a button, whose click runs the code of "A saved review opened again". -->
<button class="hedge-school-button" type="button">
  <img src="hedge-school.svg" alt=""> Open in Hedge School
</button>
<button class="hedge-school-button" type="button" aria-label="Open in Hedge School" title="Open in Hedge School">
  <img src="hedge-school.svg" alt=""> Open
</button>`;
  const SHOWN: [string, string][] = [["Review in Hedge School", ""], ["Review", "Review in Hedge School"],
                                     ["Open in Hedge School", ""], ["Open", "Open in Hedge School"]];
  const OPEN = `// On the partner's page that shows a kept review, at the player's click:
const HEDGE_SCHOOL = "${LIVE}";
const tab = window.open(HEDGE_SCHOOL + "/review#" + new URLSearchParams({
  from: location.origin, save: "https://example.com/hedge-school/save?game=123" }));
window.addEventListener("message", event => {
  if (event.origin !== HEDGE_SCHOOL || event.source !== tab) return;
  if (event.data?.type !== "hedge-school:ready") return;
  tab.postMessage({ type: "hedge-school:review", protocol: 1, review }, HEDGE_SCHOOL); // the review file, as it was saved
});`;
</script>

<PageMeta title="For developers · {SITE_NAME}"
          description="Link Enclosure games to Hedge School from your site: review and analysis links, buttons, and reviews saved back to your site." />
<svelte:head>{@html `<style>${BUTTON_CSS}</style>`}</svelte:head>

<main class={PROSE}>
  <h1>For developers</h1>
  <p>A site where Enclosure is played can send its games to {SITE_NAME} for review, or to its Analysis board, and a
    partner site can keep the reviews and open them again. This page describes how. The game goes as a game record, in
    <a href="/notation">the notation</a>.</p>

  <h2 id="link">A link to a review</h2>
  <p>One link sends a finished game here. {SITE_NAME} keeps the game in the player's browser and opens its review.</p>
  <pre>{LINK}</pre>
  <ul>
    <li><strong><code>record</code>:</strong> the game, as a game record in the notation, or a plain list of edges.
      URL-encode it, as <code>URLSearchParams</code> does.</li>
    <li><strong>Tags are welcome,</strong> none is needed: <code>Blue</code> and <code>Red</code> name the players,
      and <code>Date</code>, <code>Result</code> and <code>TimeControl</code> describe the game. Put the game's own
      page in <code>Site</code> (as Lichess does), and the review links back to it.</li>
    <li><strong>The online rules from the standard start only.</strong> A record with a <code>Rules</code> or a
      <code>Position</code> tag is refused, with a message that says why. Show the link for such games only once
      {SITE_NAME} reviews them.</li>
    <li><strong>A finished game only.</strong> A link to a game in play would give a player the engine's help.</li>
    <li>The record goes after the <code>#</code>, which a browser never sends to a server, and the page removes it
      from the address at once.</li>
  </ul>

  <h2 id="analysis">A link to the Analysis board</h2>
  <p>A link to the Analysis board opens a game, or any line from the start, on a free board: the player explores it with
    the engine, which searches only the position on screen. Nothing is reviewed, and the game is not kept in the
    player's list of games.</p>
  <pre>{ANALYSIS}</pre>
  <ul>
    <li><strong><code>record</code>:</strong> as for a review. A record that has not ended is welcome: its result is
      <code>*</code>.</li>
    <li><strong><code>position</code>:</strong> a start other than the standard one, in the
      <a href="/notation">position notation</a>, for a line from a set-up position. Alone, it opens the board at that
      position. With <code>record</code>, the record's moves start there (or put it in the record's
      <code>Position</code> tag). The engine checks that a game can reach it.</li>
    <li><strong><code>at</code>:</strong> the position that the board opens at, as a number of edges from the start.
      Without it, the board opens at the start.</li>
  </ul>

  <h2 id="save">The review saved back to a partner site</h2>
  <p>A partner site can keep its players' reviews. Its link then names a save page, <code>save</code>, on its own site
    and over https. {SITE_NAME} lists its partner sites: <a href={DISCORD}>ask in the Discord</a> to be listed. Once
    the review is done, the player can choose "Save to" the site in the review's Export menu. {SITE_NAME} opens the
    save page in a new tab, and the two pages exchange window messages (<code>postMessage</code>), in the player's
    browser:</p>
  <ol>
    <li>The save page posts <code>{"{ type: \"hedge-school:ready\" }"}</code> to <code>window.opener</code>, to the
      origin <code>{LIVE}</code>.</li>
    <li>{SITE_NAME} answers <code>{"{ type: \"hedge-school:review\", protocol: 1, name, review }"}</code>.
      <code>protocol</code> is the version of these messages. <code>review</code> is the review file (the Export menu's
      "Review file"), and <code>name</code> is a file name for it.</li>
    <li>The save page checks that the message comes from <code>window.opener</code>, and that its origin is
      <code>{LIVE}</code>. It stores the review for the signed-in player. Then it posts
      <code>{"{ type: \"hedge-school:saved\" }"}</code>, or <code>{"{ type: \"hedge-school:failed\", message }"}</code>.</li>
  </ol>
  <pre>{SAVE}</pre>
  <p>{SITE_NAME} waits a minute for each answer. Each save sends the game's whole review so far: its branches hold those
    of the earlier save, and its results only grow. Store it in the place of the earlier one, or keep each version if
    your site wants a history.</p>

  <h2 id="open">A saved review opened again</h2>
  <p>In the browser that made a review, the link to the game opens it again at once: the browser keeps the engine's
    results. In another browser, the partner's page sends the review file that it kept, and the review opens at once,
    with the engine's results. The same messages go the other way:</p>
  <ol>
    <li>At the player's click, the partner's page opens <code>{LIVE}/review#from=</code> and its own origin,
      URL-encoded, with <code>window.open</code>. A link with a <code>target</code> cuts the tie between the two pages.
      Name the save page too, <code>save</code>, as above, so that the player can save the review again after more
      work on it.</li>
    <li>{SITE_NAME} posts <code>{"{ type: \"hedge-school:ready\", protocol: 1 }"}</code> to the partner's page.</li>
    <li>The partner's page checks that the message comes from the tab it opened, on the origin
      <code>{LIVE}</code>. It answers <code>{"{ type: \"hedge-school:review\", protocol: 1, review }"}</code>,
      with the review file that it saved, or <code>{"{ type: \"hedge-school:failed\", message }"}</code>.</li>
  </ol>
  <pre>{OPEN}</pre>
  <p>{SITE_NAME} waits a minute for the review. The player can always load the file in {SITE_NAME}'s Review tab
    too.</p>
  <p><strong>The pages in these exchanges</strong> must keep their tie: the save page sends no
    <code>Cross-Origin-Opener-Policy</code> header, and the page that opens {SITE_NAME} sends none or
    <code>same-origin-allow-popups</code>. The policy <code>same-origin</code> cuts the tie, and the messages then
    reach no one.</p>

  <h2 id="buttons">Buttons</h2>
  <p>Four buttons, with the school's collie: the full labels, and short ones where space is short. "Review" goes on a
    finished game, and "Open" on a saved review. "Save to" is in {SITE_NAME}'s own Export menu, so it needs no button.</p>
  {#each ["#ffffff", "#16181c"] as background (background)}
    <div class="mb-3 flex flex-wrap gap-3 p-4 rounded border border-line" style:background>
      {#each SHOWN as [label, full] (label)}
        <span class="hedge-school-button" title={full || undefined}><img src="/brand/hedge-school.svg" alt="" /> {label}</span>
      {/each}
    </div>
  {/each}
  <ul>
    <li><strong>The collie:</strong> <a href="/brand/hedge-school.svg" download>hedge-school.svg</a>. It is
      {SITE_NAME}'s. Use it, unchanged but for its size, only in a button or a link that leads to {SITE_NAME}. Serve
      it from your own site. Its white outline keeps it clear on light and dark pages alike.</li>
    <li><strong>The style is yours to change:</strong> the colours and the font can follow your site. Keep the labels'
      words, so that players know where a button leads.</li>
    <li><strong>A short label</strong> leaves the name to the collie. Give its button the full label as its
      <code>aria-label</code> and its <code>title</code>, as below.</li>
  </ul>
  <pre>{BUTTONS}</pre>
  <pre>{BUTTON_CSS}</pre>

  <h2 id="test">Testing</h2>
  <p>To test before your own site is live, <a href={DISCORD}>ask in the Discord</a> for a test address. It runs the
    next release of {SITE_NAME}, and it also takes a save page and a <code>from</code> on your own computer:
    <code>http://localhost</code> or <code>http://127.0.0.1</code>, on any port. In your test code, use its address in
    place of <code>{LIVE}</code>. A test address shows one build: ask again for a later one.</p>

  <h2 id="changes">What can change</h2>
  <ul>
    <li><strong>{SITE_NAME} reads more than it asks for:</strong> unknown tags, an edge's points in either order, lower
      case. A site that writes the notation as its page describes it keeps working.</li>
    <li><strong>Changes are additions:</strong> new optional tags or parameters, which old links do not have. A change
      that old links could not meet would come with a version in the link, and the old form would still be read.</li>
    <li><strong>During the early access, an address can move.</strong> The old address then forwards to the new one for
      a while, and this page says, a month before, when it stops.</li>
    <li><strong>The messages have a version,</strong> <code>protocol: 1</code>. A later version would be one that the
      save page asks for in its <code>ready</code> message. A page that asks for none keeps getting version 1.
      {SITE_NAME}'s own <code>ready</code> names the version that it asks for.</li>
    <li><strong>The review file is {SITE_NAME}'s:</strong> store it as it is. Its contents can change, and it carries
      its own format and version, for {SITE_NAME} to read.</li>
    <li><strong>Changes:</strong>
      <ul>
        <li>2026-10-13: the link, and the messages to save and open a review, protocol 1.</li>
        <li>2026-10-14: the links go to <code>/review</code>, and to <code>/analysis</code> for the Analysis board. The
          old <code>/import</code> forwards to <code>/review</code>. The Analysis board takes <code>position</code>.</li>
        <li>2026-10-19: the link to a review is <code>/import#record=…</code> again, with or without
          <code>save</code>. <code>/review#record=…</code> no longer opens a game. The link that opens a kept review
          again stays <code>/review#from=…</code>.</li>
      </ul>
    </li>
  </ul>
</main>

<SiteFooter />
