<script lang="ts">
  // The Import dialog (docs/design/34-tak-site.md, item 10): the import's form over the page. A game that the site takes
  // goes to the import page in its address, after the `#`, which the browser sends to no server. The page is loaded
  // anew, so that the visit counts start there only once the game has left the address (Hedge School's design 22).
  import { Dialog } from "bits-ui";
  import ImportForm from "./ImportForm.svelte";
  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,34rem)]">
      <Dialog.Title class="mb-2 font-semibold">Import a game</Dialog.Title>
      <ImportForm onimport={({ text }) => location.assign("/import#" + new URLSearchParams({ record: text }))}>
        <Dialog.Close type="button" class="ml-auto px-3 py-1 text-sm">Cancel</Dialog.Close> <!-- not the form's submit -->
      </ImportForm>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
