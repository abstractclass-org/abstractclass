<script lang="ts" module>
  /** A question's answer: "yes" for the action, "no" for Cancel, Escape or a click outside, and "undecided" for a click
   *  within the double-click time of the opening, the second click of a double click: it closes the question with no
   *  decision. */
  export type Answer = "yes" | "no" | "undecided";
</script>

<script lang="ts">
  // A question before an action that the player cannot undo, such as a game's delete (design 11), in the site's own
  // dialog. Cancel has the focus when it opens, so that Enter does not confirm. Escape and a click outside close it, as
  // Cancel does. The action waits for the double-click time after the opening, and looks disabled until then, so the
  // second click of a double click on the button that opened the question cannot confirm it.
  import { AlertDialog } from "bits-ui";
  import type { Snippet } from "svelte";

  /** `children`: the question's text. `action`: the label of the action's button. `onanswer`: the answer, after which
   *  the caller closes the question. */
  let { open, title, action, onanswer, children }:
    { open: boolean; title: string; action: string; onanswer: (answer: Answer) => void; children: Snippet } = $props();
  let cancel = $state<HTMLButtonElement | null>(null);
  const DOUBLE_CLICK_MS = 500; // Windows' default double-click time (GetDoubleClickTime)
  let openedAt = 0, actionWaits = $state(true), waitTimer: ReturnType<typeof setTimeout> | undefined;
  // At each opening: the action waits, and Cancel takes the focus a moment after the dialog's own, as bits-ui gives its
  // own, since Cancel's element is there by then.
  function opened(e: Event) {
    openedAt = performance.now();
    clearTimeout(waitTimer);
    actionWaits = true;
    waitTimer = setTimeout(() => (actionWaits = false), DOUBLE_CLICK_MS);
    e.preventDefault();
    setTimeout(() => cancel?.focus());
  }
  // Each click uses its own time (the event's timeStamp): a click within the double-click time of the opening is the
  // second click of a double click. The timer only shows the wait on the action's button.
  const withinDoubleClick = (e: Event) => e.timeStamp - openedAt < DOUBLE_CLICK_MS;
  function respond(answer: Answer) {
    clearTimeout(waitTimer);
    actionWaits = true; // for the next opening
    onanswer(answer);
  }
  const declined = (e: Event) => respond(withinDoubleClick(e) ? "undecided" : "no");
  function outside(e: Event) {
    e.preventDefault();
    declined(e);
  }
</script>

<AlertDialog.Root {open} onOpenChange={o => { if (!o) respond("no"); }}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="dialog-overlay" />
    <AlertDialog.Content class="dialog-box w-[min(94vw,28rem)]" onOpenAutoFocus={opened}
                         interactOutsideBehavior="close" onInteractOutside={outside}>
      <AlertDialog.Title class="mb-2 font-semibold">{title}</AlertDialog.Title>
      <AlertDialog.Description class="text-sm">{@render children()}</AlertDialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="px-4 py-1 text-sm" bind:this={cancel} onclick={declined}>Cancel</button>
        <AlertDialog.Action class="px-4 py-1 text-sm not-disabled:btn-danger" disabled={actionWaits}
                            onclick={e => { if (!withinDoubleClick(e)) respond("yes"); }}>{action}</AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
