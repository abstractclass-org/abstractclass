<script lang="ts">
  // The question before Abort or Resign ends the game (Hedge School's design 24), in the side column, as Lichess asks
  // it. Each site gives its words: what becomes of the game.
  import { intoView } from "@abstractclass/site/pageScroll.ts";

  let { what, words, onconfirm, onkeep }: {
    what: "abort" | "resign";
    words: { abort: string; resign: string }; // the question for each
    onconfirm: () => void;
    onkeep: () => void; // Keep playing
  } = $props();
</script>

<div class="mt-3 p-2 rounded border border-line bg-panel-2 text-sm" role="alertdialog" aria-label={what === "resign" ? "Resign" : "Abort"}
     {@attach intoView}>
  <p class="mb-2">{words[what]}</p>
  <div class="flex gap-2">
    <button type="button" class="btn-danger text-sm" onclick={onconfirm}>{what === "resign" ? "Resign" : "Abort"}</button>
    <button type="button" class="text-sm" onclick={onkeep}>Keep playing</button>
  </div>
</div>
