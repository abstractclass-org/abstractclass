<script lang="ts">
  // The card at the window's lower left, with the collie: the consent banner (design 25), and in its place, after it,
  // the ask to allow Google Analytics in a blocker (design 27). A region, named by its title. It stops nothing on the
  // page: the page under it still scrolls and takes clicks.
  import type { Snippet } from "svelte";
  import Collie from "#lib/Collie.svelte";

  let { title, children, actions }: { title: string; children: Snippet; actions: Snippet } = $props();
  const id = $props.id();
</script>

<div class="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-md z-50 p-4 grid gap-3 bg-panel border border-line rounded-lg shadow-lg text-sm"
     role="region" aria-labelledby={id}>
  <div class="flex gap-3 items-start">
    <Collie size={48} />
    <div class="grid gap-2 min-w-0">
      <p {id} class="font-semibold text-base">{title}</p>
      {@render children()}
    </div>
  </div>
  <div class="flex flex-wrap items-center gap-2">{@render actions()}</div>
</div>
