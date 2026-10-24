<script lang="ts" module>
  export type IconName = "first" | "back" | "forward" | "last" | "menu" | "takeback" | "abort" | "resign" | "heart" | "new" | "export" | "bot" | "book";
</script>

<script lang="ts">
  // The controls' icons (the review's and Practice's steps, display settings and game actions, and the Analysis board's
  // Play, New and Export), drawn as one set: a 24-unit grid, a 2-unit stroke in the text's colour, round ends. A text
  // glyph takes its shape from the font, which differs between systems. The icon is the button's picture: the button
  // carries the name (aria-label). It sits on the text's line, so that an icon's button is as high as a word's.
  let { name }: { name: IconName } = $props();
</script>

<svg viewBox="0 0 24 24" class="inline-block size-[1.1em] align-[-0.2em]" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true">
  {#if name === "first"}
    <path d="M6 5v14" /><path d="M18 6l-8 6 8 6z" fill="currentColor" />
  {:else if name === "back"}
    <path d="M16 6l-8 6 8 6z" fill="currentColor" />
  {:else if name === "forward"}
    <path d="M8 6l8 6-8 6z" fill="currentColor" />
  {:else if name === "last"}
    <path d="M18 5v14" /><path d="M6 6l8 6-8 6z" fill="currentColor" />
  {:else if name === "menu"}
    <path d="M4 7h16M4 12h16M4 17h16" />
  {:else if name === "takeback"}
    <path d="M9 14L4 9l5-5" /><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
  {:else if name === "abort"}
    <path d="M6 6l12 12M18 6L6 18" />
  {:else if name === "resign"}
    <path d="M5 21V4" /><path d="M5 4h12l-2.5 4.5L17 13H5" fill="currentColor" fill-opacity="0.25" />
  {:else if name === "new"}
    <!-- A plus, the usual mark of "new" (a new document, tab or game). -->
    <path d="M12 5v14M5 12h14" />
  {:else if name === "export"}
    <!-- An arrow up out of a tray, the share mark of phones' share sheets: the menu sends the game out as a link, a
         file or to a partner site, not only as a download. -->
    <path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M5 12v7h14v-7" />
  {:else if name === "bot"}
    <!-- A robot's head (a rounded box with two eyes, an antenna and two ears), the common sign for "play the computer":
         the forward triangle is the step forward. -->
    <rect x="4" y="9" width="16" height="10" rx="3" /><path d="M12 9V6" /><circle cx="12" cy="5" r="1" fill="currentColor" />
    <path d="M2 12v4M22 12v4" /><circle cx="9" cy="14" r="1" fill="currentColor" /><circle cx="15" cy="14" r="1" fill="currentColor" />
  {:else if name === "book"}
    <!-- An open book (the opening book's mark, design 32): two pages from the spine, their outer edges a little higher. -->
    <path d="M12 7v13" /><path d="M12 7C10 5.5 7 5 3 5v13c4 0 7 .5 9 2 2-1.5 5-2 9-2V5c-4 0-7 .5-9 2z" />
  {:else if name === "heart"}
    <!-- Two circles of radius 4 (centres 8.5,9 and 15.5,9), and the lines from the point below that touch them. -->
    <path d="M12 20L5.35 11.46A4 4 0 1 1 12 7.06A4 4 0 1 1 18.65 11.46Z" fill="currentColor" />
  {/if}
</svg>
