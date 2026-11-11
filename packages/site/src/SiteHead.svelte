<script lang="ts">
  // The head's tags that every page of a site shares: its icons and its link preview's (Hedge School's designs 12 and
  // 23, Cyanotype's design 33, "The logo"). Each site's layout gives its own: the SVG favicon, the name, the address
  // and the words of the preview picture. Each site keeps its icon files at the same paths: /favicon.ico,
  // /apple-touch-icon.png and /brand/card.png.
  interface Props {
    /** The SVG favicon's address, as the site's build gives it (`import favicon from "…/favicon.svg"`). */
    favicon: string;
    /** The site's name and its address, with no "/" at the end. */
    name: string;
    origin: string;
    /** The preview picture's words, for those who cannot see it. */
    imageAlt: string;
  }
  let { favicon, name, origin, imageAlt }: Props = $props();
</script>

<svelte:head>
  <!-- The icons: a PNG for browsers without SVG icons, the SVG for the rest, and a square tile for iOS. -->
  <link rel="icon" href="/favicon.ico" sizes="32x32" />
  <link rel="icon" href={favicon} type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <!-- Link previews: the tags that every page shares. Each page gives its title, description and address
       (PageMeta.svelte). The picture is 1,200 × 630 pixels, Open Graph's size. -->
  <meta property="og:site_name" content={name} />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="{origin}/brand/card.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content={imageAlt} />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>
