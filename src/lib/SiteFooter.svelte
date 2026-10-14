<script lang="ts">
  // The footer of the pages that scroll (home, about, the tools, the notation, for developers, privacy, notices): the
  // pages about the site and its version, the site's copyright, and the game's designer beside it, so that the copyright
  // does not read as the game's (design 11). The review has none: it fills the window.
  import { SITE_COPYRIGHT, SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  const LINKS = [["/about", "About"], ["/tools", "Tools"], ["/notation", "The notation"], ["/developers", "For developers"], ["/privacy", "Privacy"], ["/notices", "Notices"]];
</script>

<footer class="box-content max-w-[1000px] mx-auto mt-8 mb-6 px-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
  {#each LINKS as [href, label] (href)}<a {href} class="text-muted no-underline hover:text-ink">{label}</a>{/each}
  <span class="ml-auto">{SITE_NAME}, version {SITE_VERSION} · {SITE_COPYRIGHT} · Enclosure by webgoatguy</span>
</footer>
