<script lang="ts">
  // The section "Testing" of the sites' pages for developers (Hedge School's design 18, "Consequences"): the partners'
  // test, a build that also takes a page on the partner's own computer (partners.ts). `ask` is the link where a
  // developer asks for the test's address. A site with no such place gives none, and the text then names none.
  import type { Snippet } from "svelte";
  let { site, live, ask }: { site: string; live: string; ask?: Snippet } = $props();
</script>

<h2 id="test">Testing</h2>
{#if ask}
  <p>To test before your own site is live, {@render ask()} for a test address. It runs the
    next release of {site}, and it also takes a save page and a <code>from</code> on your own computer:
    <code>http://localhost</code> or <code>http://127.0.0.1</code>, on any port. In your test code, use its address in
    place of <code>{live}</code>. A test address shows one build: ask again for a later one.</p>
{:else}
  <p>To test before your own site is live, use a test address of {site}. It runs the next release of {site}, and it
    also takes a save page and a <code>from</code> on your own computer: <code>http://localhost</code> or
    <code>http://127.0.0.1</code>, on any port. In your test code, use its address in place of
    <code>{live}</code>. A test address shows one build.</p>
{/if}
