<script lang="ts">
  // A note in a box at the foot of the window (a toast, as Gmail's "Link copied"), that says what an action did or why
  // it failed: the Export menu's, and the move menu's image. `action`: a button beside the text, such as "Save image"
  // where the clipboard refuses an image. `onclose`: the × that closes it, none while the action runs. With `onclose`, it
  // also closes itself, `ms` after its text shows: by default 4 seconds, and 10 for a longer text, which takes longer to
  // read. On a phone it shows above the step bar (--step-dock, app.css), which is fixed at the window's foot there:
  // over the bar, it would cover the steps and the button that it answers.
  let { text, failed = false, action, onclose, ms }:
    { text: string; failed?: boolean; action?: { label: string; onclick: () => void }; onclose?: () => void; ms?: number } = $props();
  const wait = $derived(ms ?? (text.length > 40 ? 10000 : 4000));
  $effect(() => {
    void text;
    if (!onclose) return;
    const timer = setTimeout(onclose, wait);
    return () => clearTimeout(timer);
  });
</script>

<div class="fixed bottom-5 one-column:bottom-[calc(var(--step-dock,0px)+1.25rem)] left-1/2 -translate-x-1/2 z-50
            flex items-start gap-3 w-max max-w-[min(32rem,calc(100vw-2rem))] px-4 py-2.5 raised rounded-lg text-sm"
     role="status" aria-live="polite">
  <p class={failed ? "text-blunder" : "text-ink"}>{text}</p>
  {#if action}<button type="button" class="flex-none px-2 py-0 text-sm" onclick={action.onclick}>{action.label}</button>{/if}
  {#if onclose}<button type="button" class="-mr-1 px-1.5 py-0 text-muted bg-transparent border-0" aria-label="Close"
                       onclick={onclose}>×</button>{/if}
</div>
