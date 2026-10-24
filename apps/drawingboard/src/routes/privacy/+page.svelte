<script lang="ts">
  // What the site keeps, and where (design 11): the theme and the scroll places. No analytics yet.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
</script>

<PageMeta title="Privacy · {SITE_NAME}" description="What Drawing Board keeps in your browser. It has no accounts, no analytics and no cookies." />

<main class={PROSE}>
  <h1>Privacy</h1>
  <p>{SITE_NAME} has no accounts, no analytics, no cookies and no server of its own.</p>

  <h2>What your browser keeps</h2>
  <ul>
    <li><strong>Your theme,</strong> when you select Light or Dark in the theme menu. The site keeps it in this
      browser's local storage. System keeps nothing.</li>
    <li><strong>Your place on each page that you open in a tab,</strong> so that Back shows the page where you left
      it. The site keeps it in the tab's session storage. The browser deletes it when you close the tab.</li>
  </ul>
  <p>They stay in this browser on this computer. To delete them, clear this site's data in your browser's
    settings.</p>

  <h2>Visits</h2>
  <p><strong>Cloudflare</strong> serves the site's files. Like any web host, it receives each request: your IP address
    and your browser's name. The site counts no visits.</p>

  <p>This page changes before the site keeps more, for example your games and their reviews.</p>
</main>

<SiteFooter />
