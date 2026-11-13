<script lang="ts">
  // The section "The review saved back to a partner site" of the sites' pages for developers (Hedge School's design 18,
  // items 4 to 6, 8): the window messages of saveToPartner (partners.ts). `messages` is the start of the site's
  // messages' names, and `partnerList` the sentences on the site's partner list and how a site joins it.
  import type { Snippet } from "svelte";
  import { PROTOCOL } from "../partners.ts";
  import { addressConstant } from "./names.ts";
  let { site, live, messages, partnerList }:
    { site: string; live: string; messages: string; partnerList: Snippet } = $props();
  const NAME = $derived(addressConstant(messages));
  const save = $derived(`// On the partner's save page, which ${site} opened:
const ${NAME} = "${live}";
window.addEventListener("message", async event => {
  if (event.origin !== ${NAME} || event.source !== window.opener) return;
  if (event.data?.type !== "${messages}:review") return;
  await store(event.data.review); // the review file, for the signed-in player's game
  window.opener.postMessage({ type: "${messages}:saved" }, ${NAME});
});
window.opener?.postMessage({ type: "${messages}:ready" }, ${NAME});`);
</script>

<h2 id="save">The review saved back to a partner site</h2>
<p>A partner site can keep its players' reviews. Its link then names a save page, <code>save</code>, on its own site
  and over https. {@render partnerList()} Once the review is done, the player can choose "Save to" the site in the review's
  Export menu. {site} opens the save page in a new tab, and the two pages exchange window messages
  (<code>postMessage</code>), in the player's browser:</p>
<ol>
  <li>The save page posts <code>{`{ type: "${messages}:ready" }`}</code> to <code>window.opener</code>, to the
    origin <code>{live}</code>.</li>
  <li>{site} answers <code>{`{ type: "${messages}:review", protocol: ${PROTOCOL}, name, review }`}</code>.
    <code>protocol</code> is the version of these messages. <code>review</code> is the review file (the Export menu's
    "Review file"), and <code>name</code> is a file name for it.</li>
  <li>The save page checks that the message comes from <code>window.opener</code>, and that its origin is
    <code>{live}</code>. It stores the review for the signed-in player. Then it posts
    <code>{`{ type: "${messages}:saved" }`}</code>, or <code>{`{ type: "${messages}:failed", message }`}</code>.</li>
</ol>
<pre>{save}</pre>
<p>{site} waits a minute for each answer. Each save sends the game's whole review so far: its variations hold those
  of the earlier save, and its results only grow. Store it in the place of the earlier one, or keep each version if
  your site wants a history.</p>
