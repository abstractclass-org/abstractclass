<script lang="ts" module>
  import type { NetworkQuestion } from "@abstractclass/analysis/files.ts";

  /** The Analysis board's question before it opens an analysis file whose network it cannot take alone (Hedge School's
   *  design 21, @abstractclass/analysis/files.ts, networkQuestion): a file of several networks, or of a network that
   *  the site no longer ships. `ask` shows it, and gives the network chosen, or null for Cancel or a close. */
  export class NetworkChoice {
    asked = $state.raw<{ question: NetworkQuestion; answer: (network: string | null) => void } | null>(null);
    ask = (question: NetworkQuestion) => new Promise<string | null>(resolve => {
      this.asked = { question, answer: network => { this.asked = null; resolve(network); } };
    });
  }
</script>

<script lang="ts">
  import { Dialog } from "bits-ui";

  let { choice }: { choice: NetworkChoice } = $props();
</script>

<!-- An analysis file whose network the board cannot take alone: the player chooses one, or keeps the board. -->
<Dialog.Root open={!!choice.asked} onOpenChange={open => { if (!open) choice.asked?.answer(null); }}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,30rem)]">
      {#if choice.asked}
        {@const { question, answer } = choice.asked}
        <Dialog.Title class="mb-2 font-semibold">{question.title}</Dialog.Title>
        <Dialog.Description class="text-sm">{question.text}</Dialog.Description>
        <div class="flex flex-wrap justify-end gap-2 mt-4">
          <button type="button" class="px-4 py-1 text-sm" onclick={() => answer(null)}>Cancel</button>
          {#each question.choices as c (c.network)}
            <button type="button" class="btn-primary px-4 py-1 text-sm" onclick={() => answer(c.network)}>Use {c.name}</button>
          {/each}
        </div>
      {/if}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
