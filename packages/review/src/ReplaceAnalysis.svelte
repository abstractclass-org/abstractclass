<script lang="ts" module>
  /** The Analysis board's question before a line brought replaces the analysis kept in this browser (Hedge School's
   *  design 21): `ask` shows it, and gives true for "Replace it", false for "Keep mine" or a close. */
  export class ReplaceQuestion {
    answer = $state<((replace: boolean) => void) | null>(null);
    ask = () => new Promise<boolean>(resolve => (this.answer = replace => { this.answer = null; resolve(replace); }));
  }
</script>

<script lang="ts">
  import { Dialog } from "bits-ui";

  let { question }: { question: ReplaceQuestion } = $props();
</script>

<!-- A line brought, over the analysis kept here: the player chooses. -->
<Dialog.Root open={!!question.answer} onOpenChange={open => { if (!open) question.answer?.(false); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,28rem)]">
      <Dialog.Title class="mb-2 font-semibold">Replace your analysis?</Dialog.Title>
      <Dialog.Description class="text-sm">
        This replaces the analysis you left here, with all its lines. This browser keeps one analysis.
      </Dialog.Description>
      <div class="flex justify-end gap-2 mt-4">
        <button type="button" class="px-4 py-1 text-sm" onclick={() => question.answer?.(false)}>Keep mine</button>
        <button type="button" class="btn-primary px-4 py-1 text-sm" onclick={() => question.answer?.(true)}>Replace it</button>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
