<script lang="ts">
  // The section "Accuracy" of the sites' pages "How a review works" (Hedge School's designs 10 and 14): Lichess's
  // formula for a move (model.ts, moveAccuracy) and KaTrain's weights (labels.ts, accuracyWeight). The weights' numbers
  // come from labels.ts. The formula's constants and its examples are typed here: model.ts does not export them.
  import { HARD, MIN_ACCURACY_WEIGHT, MISTAKE_WIN } from "@abstractclass/analysis/labels.ts";
  const weight = `max(${MIN_ACCURACY_WEIGHT.toFixed(2)}, min(1, max(complexity ÷ ${HARD.toFixed(2)}, ` +
    `loss ÷ ${MISTAKE_WIN.toFixed(2)})))`;
</script>

<h2>Accuracy</h2>
<p>Each move gets an accuracy from its loss <em>d</em>, in percent, by Lichess's formula:</p>
<pre>accuracy = 103.1668 × e^(−0.04354 × d) − 3.1669 + 1</pre>
<p>A loss of 0 gives 100, a loss of 10% about 65, and a loss of 40% about 16. A player's accuracy is the mean of their
  moves' accuracies, each weighed as KaTrain weighs it:</p>
<pre>weight = {weight}</pre>
<p>A move in a hard position, or a large loss, counts in full. An easy move with no loss counts for little, so a long
  run of obvious moves cannot hide the moves that mattered.</p>
