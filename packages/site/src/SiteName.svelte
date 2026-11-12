<script lang="ts">
  // The site's name in the header (Hedge School's design 11, "The header"): the logo and the name (`children`), which
  // lead home, and in the early access "Early Access" beside them, in the accent colour, which leads to the About
  // page's section on the early access. Each site's About page has that section (`#early-access`). Neither goes onto
  // a second line, which would make the header taller than --site-header: the header's row makes the room for them.
  import type { Snippet } from "svelte";
  import { EARLY_ACCESS } from "./edition.ts";

  let { children, class: extra }: { children: Snippet; class?: string } = $props();
</script>

<span class={["flex items-center gap-2 whitespace-nowrap", extra]}>
  <a class="flex items-center gap-2 text-xl font-bold text-ink no-underline" href="/">{@render children()}</a>
  {#if EARLY_ACCESS}<a class="text-xs font-semibold text-accent no-underline hover:underline" href="/about#early-access">Early Access</a>{/if}
</span>
