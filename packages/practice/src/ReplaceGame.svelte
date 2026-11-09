<script lang="ts">
  // The question when a start is brought to Practice while a game is in progress (design 24, item 4): the player
  // chooses the game in progress or the start brought, since a browser keeps one game in progress. The answers wait
  // for the page's rules (`ready`). Closing the dialog keeps the game in progress. Each site gives its words: what
  // becomes of the game in progress, and what was brought.
  import { Dialog } from "bits-ui";

  let { open, ready, title, description, play, onanswer }: {
    open: boolean;
    ready: boolean;
    title: string; // "Play from this record?"
    description: string; // what becomes of the game in progress
    play: string; // the answer that plays from the start brought: "Play from the record"
    onanswer: (brought: boolean) => void; // true: the start brought, false: the game in progress
  } = $props();
</script>

<Dialog.Root {open} onOpenChange={o => { if (!o && open && ready) onanswer(false); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,28rem)]">
      <Dialog.Title class="mb-2 font-semibold">{title}</Dialog.Title>
      <Dialog.Description class="text-sm">{description}</Dialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="px-4 py-1 text-sm" disabled={!ready} onclick={() => onanswer(false)}>Go on with mine</button>
        <button type="button" class="btn-primary px-4 py-1 text-sm" disabled={!ready} onclick={() => onanswer(true)}>{play}</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
