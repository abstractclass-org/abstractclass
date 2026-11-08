<script lang="ts">
  // The section "Accuracy" of the sites' pages "How a review works" (Hedge School's designs 10 and 14): Lichess's
  // formula for a move (model.ts, moveAccuracy) and KaTrain's weights (labels.ts, accuracyWeight), as the code has
  // them. The examples follow from the formula.
  import { HARD } from "@abstractclass/analysis/labels.ts";
</script>

<h2>Accuracy</h2>
<p>Each move gets an accuracy from its loss <em>d</em>, in percent, by Lichess's formula:</p>
<pre>accuracy = 103.1668 × e^(−0.04354 × d) − 3.1669 + 1</pre>
<p>A loss of 0 gives 100, a loss of 10% about 65, and a loss of 40% about 16. A player's accuracy is the mean of their
  moves' accuracies, each weighed as KaTrain weighs it:</p>
<pre>weight = max(0.05, min(1, max(complexity ÷ {HARD.toFixed(2)}, loss ÷ 0.20)))</pre>
<p>A move in a hard position, or a large loss, counts in full. An easy move with no loss counts for little, so a long
  run of obvious moves cannot hide the moves that mattered.</p>
