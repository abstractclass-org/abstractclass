<script lang="ts">
  // The consent banner (design 11): asks once whether Google Analytics may set cookies. Accept and Decline look the
  // same, so that declining is as easy as accepting. The privacy page can change the choice later.
  import { choose } from "#lib/analytics.svelte.ts";
  import { SITE_NAME } from "#lib/edition.ts";
</script>

<div class="fixed bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-50 p-4 grid gap-3 bg-panel border border-line rounded-lg shadow-lg text-sm"
     role="region" aria-label="Cookies">
  <p>{SITE_NAME} uses Google Analytics to count visits. May it set cookies to tell repeat visits apart? Without them,
    Google still receives each page you open, with nothing that links one visit to the next.
    <a href="/privacy">Privacy</a></p>
  <div class="flex gap-2">
    <button type="button" onclick={() => choose("granted")}>Accept</button>
    <button type="button" onclick={() => choose("denied")}>Decline</button>
  </div>
</div>
