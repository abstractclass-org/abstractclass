<script lang="ts">
  // The page for other sites (design 18), as Lichess's page for developers: the link that sends a game here, the
  // messages that save its review back to a partner site and open it again from there, and what can change. The game
  // record's notation has its own page. The examples name the live site's address, which a partner's code names. A
  // partner tests against a deployment of the branch partner_test (design 18), whose address the page does not give.
  import { PROSE } from "#lib/prose.ts";
  import { DISCORD, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  const LIVE = "https://hedgeschool.abstractclass.org";
  const LINK = `const link = "${LIVE}/import#" + new URLSearchParams({ record });
// with a save page, for a partner site:
const link = "${LIVE}/import#" + new URLSearchParams({ record, save: "https://example.com/hedge-school/save?game=123" });`;
  const SAVE = `// On the partner's save page, which Hedge School opened:
const HEDGE_SCHOOL = "${LIVE}";
window.addEventListener("message", async event => {
  if (event.origin !== HEDGE_SCHOOL || event.source !== window.opener) return;
  if (event.data?.type !== "hedge-school:review") return;
  await store(event.data.review); // the review file, for the signed-in player's game
  window.opener.postMessage({ type: "hedge-school:saved" }, HEDGE_SCHOOL);
});
window.opener?.postMessage({ type: "hedge-school:ready" }, HEDGE_SCHOOL);`;
  const OPEN = `// On the partner's page that shows a kept review, at the player's click:
const HEDGE_SCHOOL = "${LIVE}";
const tab = window.open(HEDGE_SCHOOL + "/import#" + new URLSearchParams({ from: location.origin }));
window.addEventListener("message", event => {
  if (event.origin !== HEDGE_SCHOOL || event.source !== tab) return;
  if (event.data?.type !== "hedge-school:ready") return;
  tab.postMessage({ type: "hedge-school:review", protocol: 1, review }, HEDGE_SCHOOL); // the review file, as it was saved
});`;
</script>

<svelte:head><title>For developers · {SITE_NAME}</title></svelte:head>

<main class={PROSE}>
  <h1>For developers</h1>
  <p>A site where Enclosure is played can send its games to {SITE_NAME} for review, and a partner site can keep the
    reviews and open them again. This page describes how. The game goes as a game record, in <a href="/notation">the notation</a>.</p>

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

  <h2 id="save">The review saved back to a partner site</h2>
  <p>A partner site can keep its players' reviews. Its link then names a save page, <code>save</code>, on its own site
    and over https. {SITE_NAME} lists its partner sites: <a href={DISCORD}>ask in the Discord</a> to be listed. Once
    the review is done, the player can choose "Save to" the site in the review's Export menu. {SITE_NAME} opens the
    save page in a new tab, and the two pages exchange window messages (<code>postMessage</code>), in the player's
    browser:</p>
  <ol>
    <li>The save page posts <code>{"{ type: \"hedge-school:ready\" }"}</code> to <code>window.opener</code>, to the
      origin <code>{LIVE}</code>.</li>
    <li>{SITE_NAME} answers <code>{"{ type: \"hedge-school:review\", protocol: 1, name, review }"}</code>:
      <code>protocol</code> is the version of these messages, <code>review</code> the review file (the Export menu's
      "Review file"), and <code>name</code> a file name for it.</li>
    <li>The save page checks that the message comes from <code>window.opener</code> and that its origin is
      <code>{LIVE}</code>, stores the review for the signed-in player, and posts
      <code>{"{ type: \"hedge-school:saved\" }"}</code>, or <code>{"{ type: \"hedge-school:failed\", message }"}</code>.</li>
  </ol>
  <pre>{SAVE}</pre>
  <p>{SITE_NAME} waits a minute for each answer.</p>

  <h2 id="open">A saved review opened again</h2>
  <p>In the browser that made a review, the link to the game opens it again at once: the browser keeps the engine's
    results. In another browser, the partner's page sends the review file that it kept, and the review opens at once,
    with the engine's results. The same messages go the other way:</p>
  <ol>
    <li>At the player's click, the partner's page opens <code>{LIVE}/import#from=</code> and its own origin,
      URL-encoded, with <code>window.open</code>. A link with a <code>target</code> cuts the tie between the two pages.
      The link can also name the save page, <code>save</code>, as above.</li>
    <li>{SITE_NAME} posts <code>{"{ type: \"hedge-school:ready\", protocol: 1 }"}</code> to the partner's page.</li>
    <li>The partner's page checks that the message comes from the tab it opened, on the origin
      <code>{LIVE}</code>, and answers <code>{"{ type: \"hedge-school:review\", protocol: 1, review }"}</code>
      with the review file as it was saved, or <code>{"{ type: \"hedge-school:failed\", message }"}</code>.</li>
  </ol>
  <pre>{OPEN}</pre>
  <p>{SITE_NAME} waits a minute for the review. The player can always import the file on {SITE_NAME}'s home page
    too.</p>
  <p><strong>The pages in these exchanges</strong> must keep their tie: the save page sends no
    <code>Cross-Origin-Opener-Policy</code> header, and the page that opens {SITE_NAME} sends none or
    <code>same-origin-allow-popups</code>. The policy <code>same-origin</code> cuts the tie, and the messages then
    reach no one.</p>

  <h2 id="changes">What can change</h2>
  <ul>
    <li><strong>{SITE_NAME} reads more than it asks for:</strong> unknown tags, an edge's points in either order, lower
      case. A site that writes the notation as its page describes it keeps working.</li>
    <li><strong>Changes are additions:</strong> new optional tags or parameters, which old links do not have. A change
      that old links could not meet would come with a version in the link, and the old form would still be read. A
      link made once keeps working.</li>
    <li><strong>The messages have a version,</strong> <code>protocol: 1</code>. A later version would be one that the
      save page asks for in its <code>ready</code> message. A page that asks for none keeps getting version 1.
      {SITE_NAME}'s own <code>ready</code> names the version that it asks for.</li>
    <li><strong>The review file is {SITE_NAME}'s:</strong> store it as it is. Its contents can change, and it carries
      its own format and version, for {SITE_NAME} to read.</li>
    <li><strong>To test</strong> before your own site is live, <a href={DISCORD}>ask in the Discord</a> for the test
      address. It runs the next release, and it also takes a save page and a <code>from</code> on your own computer
      (<code>http://localhost</code> or <code>http://127.0.0.1</code>, any port).</li>
    <li><strong>Changes:</strong> 2026-10-13: the link, and the messages to save and open a review, protocol 1.</li>
  </ul>
</main>

<SiteFooter />
