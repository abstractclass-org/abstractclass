<script lang="ts">
  // A question before an action that the player cannot undo, such as a game's delete (design 11), in the site's own
  // dialog. Cancel has the focus when it opens, so that Enter does not confirm. Escape and a click outside cancel, as
  // Cancel does, but for the second click of a double click on the button that opened the question: a click outside,
  // or on the action, within the double-click time of its opening does nothing.
  import { AlertDialog } from "bits-ui";
  import type { Snippet } from "svelte";

  /** `children`: the question's text. `action`: the label of the action's button. `onanswer`: true for the action,
   *  false for Cancel, Escape or a click outside. */
  let { open, title, action, onanswer, children }:
    { open: boolean; title: string; action: string; onanswer: (yes: boolean) => void; children: Snippet } = $props();
  let cancel = $state<HTMLElement | null>(null);
  const DOUBLE_CLICK_MS = 500; // Windows' default double-click time (GetDoubleClickTime)
  let openedAt = 0;
  // At each opening: Cancel takes the focus a moment after the dialog's own, as bits-ui gives its own, since Cancel's
  // element is there by then.
  function opened(e: Event) {
    openedAt = performance.now();
    e.preventDefault();
    setTimeout(() => cancel?.focus());
  }
  // A press this soon after the opening is the second click of a double click (the event's time: the press's own).
  const tooSoon = (e: Event) => e.timeStamp - openedAt < DOUBLE_CLICK_MS;
  const outside = (e: Event) => { if (tooSoon(e)) e.preventDefault(); };
</script>

<AlertDialog.Root {open} onOpenChange={o => { if (!o) onanswer(false); }}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="dialog-overlay" />
    <AlertDialog.Content class="dialog-box w-[min(94vw,28rem)]" onOpenAutoFocus={opened}
                         interactOutsideBehavior="close" onInteractOutside={outside}>
      <AlertDialog.Title class="mb-2 font-semibold">{title}</AlertDialog.Title>
      <AlertDialog.Description class="text-sm">{@render children()}</AlertDialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <AlertDialog.Cancel class="px-4 py-1 text-sm" bind:ref={cancel}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action class="btn-danger px-4 py-1 text-sm"
                            onclick={e => { if (!tooSoon(e)) onanswer(true); }}>{action}</AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
