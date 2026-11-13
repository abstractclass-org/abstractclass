<script lang="ts">
  // The section "A saved review opened again" of the sites' pages for developers (Hedge School's design 18, item 7): the
  // messages of receiveKeptReview (partners.ts), and the tie between the pages that both exchanges need.
  import { PROTOCOL } from "../partners.ts";
  import { messageConstant } from "./names.ts";
  let { site, live, messages }: { site: string; live: string; messages: string } = $props();
  const NAME = $derived(messageConstant(messages));
  const open = $derived(`// On the partner's page that shows a kept review, at the player's click:
const ${NAME} = "${live}";
const tab = window.open(${NAME} + "/review#" + new URLSearchParams({
  from: location.origin, save: "https://example.com/${messages}/save?game=123" }));
window.addEventListener("message", event => {
  if (event.origin !== ${NAME} || event.source !== tab) return;
  if (event.data?.type !== "${messages}:ready") return;
  tab.postMessage({ type: "${messages}:review", protocol: ${PROTOCOL}, review }, ${NAME}); // the review file, as it was saved
});`);
</script>

<h2 id="open">A saved review opened again</h2>
<p>In the browser that made a review, the link to the game opens it again at once: the browser keeps the engine's
  results. In another browser, the partner's page sends the review file that it kept, and the review opens at once,
  with the engine's results. The same messages go the other way:</p>
<ol>
  <li>At the player's click, the partner's page opens <code>{live}/review#from=</code> and its own origin,
    URL-encoded, with <code>window.open</code>. A link with a <code>target</code> cuts the tie between the two pages.
    Name the save page too, <code>save</code>, as above, so that the player can save the review again after more
    work on it.</li>
  <li>{site} posts <code>{`{ type: "${messages}:ready", protocol: ${PROTOCOL} }`}</code> to the partner's page.</li>
  <li>The partner's page checks that the message comes from the tab it opened, on the origin
    <code>{live}</code>. It answers <code>{`{ type: "${messages}:review", protocol: ${PROTOCOL}, review }`}</code>,
    with the review file that it saved, or <code>{`{ type: "${messages}:failed", message }`}</code>.</li>
</ol>
<pre>{open}</pre>
<p>{site} waits a minute for the review. The player can always load the file in {site}'s Review tab
  too.</p>
<p><strong>The pages in these exchanges</strong> must keep their tie: the save page sends no
  <code>Cross-Origin-Opener-Policy</code> header, and the page that opens {site} sends none or
  <code>same-origin-allow-popups</code>. The policy <code>same-origin</code> cuts the tie, and the messages then
  reach no one.</p>
