<!-- A label's mark (model.ts, LABEL_GLYPH): its character, or its icon in the text's colour. -->
<script lang="ts">
  import type { Glyph } from "./model.ts";

  let { glyph }: { glyph: Glyph } = $props();
</script>

{#if typeof glyph === "string"}{glyph}{:else}<svg class="size-[1em]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={glyph.path} /></svg>{/if}
