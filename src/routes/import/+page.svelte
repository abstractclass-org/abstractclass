<script lang="ts">
  // The review's old way in (design 22): deprecated, and forwarded during the early access. An address with a `#` part
  // goes on to the review with it: the meaf.us tools' records, another site's `record=` and `from=`. The page alone goes
  // to the tools for other sites, which it showed. It counts nothing: the layout starts no analytics here.
  import { onMount } from "svelte";

  onMount(() => location.replace(location.hash.length > 1 ? `/review${location.hash}` : "/tools"));
</script>

<svelte:head><title>Hedge School</title></svelte:head>

<p class="box-content max-w-184 mx-auto my-6 px-4 text-muted">Opening Hedge School…</p>
