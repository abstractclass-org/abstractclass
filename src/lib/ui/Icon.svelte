<script lang="ts" module>
  export type IconName = "first" | "back" | "forward" | "last" | "menu" | "takeback" | "abort" | "resign";
</script>

<script lang="ts">
  // The controls' icons (the review's and Practice's steps, display settings and game actions), drawn as one set: a
  // 24-unit grid, a 2-unit stroke in the text's colour, round ends. A text glyph takes its shape from the font, which
  // differs between systems. The icon is the button's picture: the button carries the name (aria-label). It sits on the
  // text's line, so that an icon's button is as high as a word's.
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
  {/if}
</svg>
