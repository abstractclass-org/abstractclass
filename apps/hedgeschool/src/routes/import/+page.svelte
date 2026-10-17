<script lang="ts">
  // The review's old way in (design 22): deprecated, and forwarded during the early access. An address with a `#` part
  // goes on to the review with it: the meaf.us tools' records, another site's `record=` and `from=`. The page alone goes
  // to the tools for other sites, which it showed. It counts nothing itself: the layout starts no analytics here. It
  // leaves a mark in the tab's session (FORWARDED), so that the review warns a developer in its console and counts the
  // links that still use this address (Arrival.svelte).
  import { onMount } from "svelte";
  import { FORWARDED } from "#lib/game/importHash.ts";
  import { writeSession } from "#lib/storage/local.ts";
  import PageMeta from "#lib/PageMeta.svelte";

  onMount(() => {
    if (location.hash.length > 1) writeSession(FORWARDED, "1"); // storage blocked: no warning
    location.replace(location.hash.length > 1 ? `/review${location.hash}` : "/tools");
  });
</script>

<PageMeta title="Hedge School" noindex /> <!-- a deprecated address that forwards (design 22) -->

<p class="box-content max-w-184 mx-auto my-6 px-4 text-muted">Opening Hedge School…</p>
