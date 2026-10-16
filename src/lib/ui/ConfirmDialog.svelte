<script lang="ts">
  // A question before an action that the player cannot undo, such as a game's delete (design 11), in the site's own
  // dialog. Cancel has the focus when it opens, so that Enter does not confirm, and Escape cancels. A click outside
  // does nothing, so the second click of a double click on the button that opened it leaves the question open.
  import { AlertDialog } from "bits-ui";
  import type { Snippet } from "svelte";

  /** `children`: the question's text. `action`: the label of the action's button. `onanswer`: true for the action,
   *  false for Cancel or Escape. */
  let { open, title, action, onanswer, children }:
    { open: boolean; title: string; action: string; onanswer: (yes: boolean) => void; children: Snippet } = $props();
  let cancel = $state<HTMLElement | null>(null);
  // After the dialog's own focus, a moment later, as bits-ui gives its own: Cancel's element is there by then.
  const focusCancel = (e: Event) => { e.preventDefault(); setTimeout(() => cancel?.focus()); };
</script>

<AlertDialog.Root {open} onOpenChange={o => { if (!o) onanswer(false); }}>
  <AlertDialog.Portal>
    <AlertDialog.Overlay class="dialog-overlay" />
    <AlertDialog.Content class="dialog-box w-[min(94vw,28rem)]" onOpenAutoFocus={focusCancel}>
      <AlertDialog.Title class="mb-2 font-semibold">{title}</AlertDialog.Title>
      <AlertDialog.Description class="text-sm">{@render children()}</AlertDialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <AlertDialog.Cancel class="px-4 py-1 text-sm" bind:ref={cancel}>Cancel</AlertDialog.Cancel>
        <AlertDialog.Action class="btn-danger px-4 py-1 text-sm"
                            onclick={() => onanswer(true)}>{action}</AlertDialog.Action>
      </div>
    </AlertDialog.Content>
  </AlertDialog.Portal>
</AlertDialog.Root>
