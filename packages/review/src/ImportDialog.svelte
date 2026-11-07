<script lang="ts">
  // The Analysis board's Import (Hedge School's design 21, item 5), from its New menu: a position, moves, or both
  // pasted. Lichess's Analysis board takes a FEN and a PGN apart: here a position and the moves from it, both in the
  // site's notation. The page checks them as an import is checked (`onimport`, which throws an Error that says what is
  // wrong), then opens them. An analysis file has its own Load. Each site gives its board editor's address, its
  // examples, and the word for its moves in a plain list.
  import { Dialog } from "bits-ui";
  let { open = $bindable(false), editor, positionExample, movesExample, moveWord, onimport }: {
    open?: boolean;
    editor: string; // the board editor's address, from the position on screen
    positionExample: string; // the position field's placeholder
    movesExample: string; // the moves field's placeholder
    moveWord: string; // the moves of a plain list: Hedge School's "edges", Cyanotype's "moves"
    onimport: (position: string, moves: string) => Promise<void>; // the position with its spaces made single
  } = $props();

  let pasted = $state(""), pastedPosition = $state(""), problem = $state(""), checking = $state(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    problem = "";
    checking = true;
    try {
      await onimport(pastedPosition.trim().replace(/\s+/g, " "), pasted);
    } catch (e) {
      problem = (e as Error).message;
    } finally {
      checking = false;
    }
  }
</script>

<Dialog.Root bind:open>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,34rem)]">
      <Dialog.Title class="mb-2 font-semibold">Import a position or moves</Dialog.Title>
      <form onsubmit={submit}>
        <label for="board-position" class="block text-sm">Position</label>
        <p class="mb-1 text-xs text-muted">Leave it empty for the standard start. Or set one up in the
          <a href={editor}>board editor</a>.</p>
        <input id="board-position" bind:value={pastedPosition} spellcheck="false" autocomplete="off"
               class="w-full mb-3 px-2.5 py-1.5 font-mono text-sm bg-page text-ink border border-line rounded focus:outline-2 focus:outline-accent"
               placeholder={positionExample} />
        <label for="board-record" class="block text-sm">Moves</label>
        <p class="mb-1 text-xs text-muted">The moves played from the position: a game record, finished or not, or a plain
          list of {moveWord}, in the <a href="/notation" target="_blank" rel="noopener noreferrer">notation</a>.</p>
        <textarea id="board-record" rows="4" bind:value={pasted} spellcheck="false"
                  class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line rounded resize-y focus:outline-2 focus:outline-accent"
                  placeholder={movesExample}></textarea>
        {#if problem}<p class="mt-1.5 text-sm text-blunder" role="alert">{problem}</p>{/if}
        <div class="flex flex-wrap items-center gap-3 mt-2">
          <button class="btn-primary" type="submit" disabled={(!pasted.trim() && !pastedPosition.trim()) || checking}>{checking ? "Checking…" : "Import"}</button>
          <Dialog.Close type="button" class="ml-auto px-3 py-1 text-sm">Cancel</Dialog.Close> <!-- not the form's submit -->
        </div>
      </form>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
