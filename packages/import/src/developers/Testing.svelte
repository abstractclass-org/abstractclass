<script lang="ts">
  // The section "Testing" of the sites' pages for developers (Hedge School's design 18, "Consequences"): the partners'
  // test, a build that also takes a page on the partner's own computer (partners.ts). A developer asks for the test's
  // address in the players' Discord, which both sites share (@abstractclass/site/community.ts).
  import { DISCORD } from "@abstractclass/site/community.ts";
  let { site, live }: { site: string; live: string } = $props();
</script>

<h2 id="test">Testing</h2>
<p>To test before your own site is live, <a href={DISCORD}>ask in the Discord</a> for a test address. It runs the next release of {site}, and it also takes a save page and a <code>from</code> on your own
  computer: <code>http://localhost</code> or <code>http://127.0.0.1</code>, on any port. In your test code, use its
  address in place of <code>{live}</code>. A test address shows one build: ask again for a later one.</p>
