<script lang="ts">
  // The footer of the pages that scroll (home, about, the tools, the notation, for developers, privacy, notices): the
  // pages about the site that the header does not hold, its version, the site's copyright, and the game's designer
  // beside it, so that the copyright does not read as the game's (design 11). The header holds About and The notation,
  // and Tools from a tablet's width, so Tools is here on a phone only. The review has none: it fills the window.
  import { SITE_COPYRIGHT, SITE_NAME, SITE_VERSION } from "#lib/edition.ts";
  const LINKS: [string, string, boolean?][] = [["/how-reviews-work", "How reviews work"], ["/tools", "Tools", true], ["/developers", "For developers"],
                                               ["/privacy", "Privacy"], ["/notices", "Notices"]]; // true: on a phone only
</script>

<footer class="box-content max-w-[1000px] mx-auto mt-8 mb-6 px-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
  {#each LINKS as [href, label, phone] (href)}<a {href} class={["text-muted no-underline hover:text-ink", phone && "sm:hidden"]}>{label}</a>{/each}
  <span class="ml-auto">{SITE_NAME}, version {SITE_VERSION} · {SITE_COPYRIGHT} · Enclosure by webgoatguy</span>
</footer>
