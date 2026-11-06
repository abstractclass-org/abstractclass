<script lang="ts">
  // What the site keeps, and where (design 11), in Hedge School's words: what the browser keeps, and the visits. No
  // analytics yet.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Cyanotype keeps in your browser. It has no accounts, no analytics and no cookies." />

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts, no analytics, no cookies and no server of its own. The engine runs in your browser,
    so your games and their reviews stay on your computer.</p>

  <h2>What your browser keeps</h2>
  <p>Your browser keeps the games that you review, with their reviews and analyses. It also keeps your work on the
    Analysis board, the practice game in progress, your settings and your choices. They stay in this browser on this
    computer. To delete them, clear this site's data in your browser's settings.</p>

  <h2>Visits</h2>
  <p><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP address
    and your browser's name. The site counts no visits.</p>
</main>

<SiteFooter />
