<script lang="ts">
  // A note in a box at the foot of the window (a toast, as Gmail's "Link copied"), that says what an action did or why
  // it failed: the Export menu's, and the move menu's image. `action`: a button beside the text, such as "Save image"
  // where the clipboard refuses an image. `onclose`: the × that closes it, none while the action runs.
  import type { Snippet } from "svelte";
  let { text, failed = false, action, onclose }: { text: string; failed?: boolean; action?: Snippet; onclose?: () => void } = $props();
</script>

<div class="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 w-max max-w-[min(32rem,calc(100vw-2rem))]
            px-4 py-2.5 raised rounded-lg text-sm"
     role="status" aria-live="polite">
  <p class={failed ? "text-blunder" : "text-ink"}>{text}</p>
  {@render action?.()}
  {#if onclose}<button type="button" class="-mr-1 px-1.5 py-0 text-muted bg-transparent border-0" aria-label="Close"
                       onclick={onclose}>×</button>{/if}
</div>
