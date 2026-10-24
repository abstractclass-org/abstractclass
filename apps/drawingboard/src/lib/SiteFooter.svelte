<script lang="ts">
  // The footer of the pages, as Hedge School's (design 11): the pages about the site that the header does not hold,
  // its version, the site's copyright, and the game's home beside it, so that the copyright does not read as the
  // game's.
  import { SITE_COPYRIGHT, SITE_NAME, SITE_VERSION } from "#lib/site.ts";
  const LINKS: [string, string][] = [["/privacy", "Privacy"], ["/notices", "Notices"]];
</script>

<footer class="box-content max-w-[1000px] mx-auto mt-8 mb-6 px-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
  {#each LINKS as [href, label] (href)}<a {href} class="text-muted no-underline hover:text-ink">{label}</a>{/each}
  <span class="ml-auto">{SITE_NAME}, version {SITE_VERSION} · {SITE_COPYRIGHT} · Blueprints from
    <a class="text-muted hover:text-ink" href="https://strategyjam.org">strategyjam.org</a></span>
</footer>
