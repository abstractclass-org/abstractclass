<script lang="ts">
  // How a review works (designs 05, 10, 14 and 16), for a player who wants to know where the labels, the accuracy, the
  // hard positions and the meter come from: the rules and their numbers, in words, with the sources they follow. The
  // numbers are the code's (@abstractclass/analysis/labels.ts, model.ts, src/lib/analysis/engineSettings.ts): a change
  // there changes this page.
  import { PROSE } from "@abstractclass/site/prose.ts";
  import { SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
</script>

<PageMeta title="How a review works · {SITE_NAME}"
          description="How Hedge School reviews an Enclosure game: the engine's searches, the quality labels from Great to Blunder, the accuracy, hard positions and the likely edges' meter." />

<main class={PROSE}>
  <h1>How a review works</h1>
  <p>The engine, HedgeFund, searches every position of your game in your browser. For each position it estimates each
    player's chance to win, and the edges worth playing. A move's quality label compares the position before the move with the
    position after it. This page gives the rules and their numbers, and where each one comes from.</p>

  <h2>The searches</h2>
  <p>A search counts its work in <strong>visits</strong>: each visit adds one position to the search, down the lines that
    look best so far. More visits give a better estimate, and take longer.</p>
  <ul>
    <li><strong>A first look</strong> at every position, at 32 visits, draws the chart's first estimate.</li>
    <li><strong>The label stage</strong> searches every position at the review's depth: 512 visits with Lite, the default,
      and 1,024 with Standard (the engine's settings).</li>
    <li><strong>The position on screen</strong> gets a search to the Depth setting, 1,024 visits by default. Each
      position keeps its deepest result, and everything follows it: the quality labels of the moves into and out of it, the
      report and the chart. So a position you look at closely can change its labels.</li>
  </ul>
  <p>Your browser keeps the results, so a game reviewed before opens at once.</p>

  <h2>The quality labels</h2>
  <p>A move's <strong>loss</strong> is the mover's win chance before the move, less the mover's win chance after it,
    each from its own position's search. A move that raises the win chance loses nothing. The quality label reads the loss in
    the bands that chess.com uses for every player:</p>
  <table>
    <thead><tr><th>Quality label</th><th>Win chance lost</th></tr></thead>
    <tbody>
      <tr><td>Excellent</td><td>up to 2%</td></tr>
      <tr><td>Good</td><td>up to 5%</td></tr>
      <tr><td>Inaccuracy</td><td>up to 10%</td></tr>
      <tr><td>Mistake</td><td>up to 20%</td></tr>
      <tr><td>Blunder</td><td>more than 20%</td></tr>
    </tbody>
  </table>
  <ul>
    <li><strong>Best:</strong> the engine's own first choice, whatever its loss. Two searches each have a small error,
      and the engine's own move should never read as a mistake.</li>
    <li><strong>Great:</strong> the only good move, which keeps the gain from the enemy's last turn. It is Best,
      and the engine's second choice is at least 10% worse. The second choice usually has few visits, so a search of
      the position after it, as deep as the position after your move, must confirm the gap. Until then the move is
      Best. Also, the engine's first choice must be more than 5% better for you than the position before the
      enemy's last turn. An only move that only holds the position is Best. The game's last move is never Great:
      nothing after it can confirm it. The first turn is never Great: no turn of the enemy comes before it.</li>
    <li><strong>A turn or an edge:</strong> a turn of two edges is one decision, so the review judges whole turns by
      default. "Review by" in the display settings judges each edge instead. A turn's loss is from its start to the
      position after its last edge, which equals the sum of its edges' losses.</li>
    <li><strong>Why win chance, not the lead:</strong> once a game is decided, a move changes the result little,
      whatever it does to the score. A loss of 30 in the lead matters less at a lead of 120 than at a lead of 20. The
      notes also give the loss in the lead, from the engine's estimate of the lead.</li>
    <li><strong>When a quality label shows:</strong> once the search of each position of the move reaches 256 visits. A
      deeper search can change it.</li>
  </ul>
  <p>The move list and the chart show Great, Inaccuracy, Mistake and Blunder, to stay quiet. The board shows every quality label.
    Under a Mistake or a Blunder, the engine's best line from that position shows as a variation.</p>

  <h2>Accuracy</h2>
  <p>Each move gets an accuracy from its loss <em>d</em>, in percent, by Lichess's formula:</p>
  <pre>accuracy = 103.1668 × e^(−0.04354 × d) − 3.1669 + 1</pre>
  <p>A loss of 0 gives 100, a loss of 10% about 65, and a loss of 40% about 16. A player's accuracy is the mean of their
    moves' accuracies, each weighed as KaTrain weighs it:</p>
  <pre>weight = max(0.05, min(1, max(complexity ÷ 0.10, loss ÷ 0.20)))</pre>
  <p>A move in a hard position, or a large loss, counts in full. An easy move with no loss counts for little, so a long
    run of obvious moves cannot hide the moves that mattered.</p>

  <h2>Hard positions</h2>
  <p>A position's <strong>complexity</strong> is KaTrain's: the average loss of the edges that the engine searched, each
    weighed by how likely the network thinks a strong player would choose it. A complexity of 0.10 or more is a
    <strong>hard position</strong>, marked ◆: there, the likely edges lose a Mistake's worth on average. A turn is as hard
    as its harder position. The Difficulty chart, beside the Advantage chart, shows each turn's complexity, so you can see
    whether the mistakes fell where the game was hard.</p>

  <h2>The likely edges' meter</h2>
  <p>Under the engine's line, the meter shows what the network expects a player to choose here, as Maia's Blunder Meter
    does. It adds up the network's likelihood of the searched edges, by how much each one loses against the best: good
    or better (up to 5%), Inaccuracy (up to 10%), Mistake (up to 20%) and Blunder. The grey rest is the edges that the
    search did not reach.</p>

  <h2>Where the rules come from</h2>
  <p>{SITE_NAME} follows tools that players already trust, and names each change it makes for Enclosure:</p>
  <ul>
    <li><strong>The engine:</strong> a search derived from <a href="https://github.com/lightvector/KataGo">KataGo</a>, with
      a network trained for Enclosure.</li>
    <li><strong>The bands:</strong> chess.com's, on the engine's win chance, as chess.com and Lichess judge moves.</li>
    <li><strong>The accuracy:</strong> <a href="https://lichess.org/page/accuracy">Lichess's</a> formula, with
      <a href="https://github.com/sanderland/katrain">KaTrain</a>'s weights.</li>
    <li><strong>Great:</strong> <a href="https://github.com/franciscoBSalgueiro/en-croissant">En Croissant</a>'s
      rule for "!": the only good move, which keeps the gain from the enemy's last turn.</li>
    <li><strong>The complexity:</strong> KaTrain's. <strong>The meter:</strong> Maia's Blunder Meter.</li>
    <li><strong>Turns of two edges</strong> have no model in chess or Go: judging whole turns is {SITE_NAME}'s own
      choice.</li>
  </ul>
  <p><a href="/notation">The notation page</a> describes the game records that the review reads.</p>
</main>

<SiteFooter />
