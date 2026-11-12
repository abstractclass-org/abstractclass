<script lang="ts">
  // The privacy page's section on the practice games that the site stores (Hedge School's design 25), in a build that
  // stores them: what the site keeps, why, and the random ID's choice, which the page's "Your choices" holds
  // (GamesChoices.svelte). Text that explains: the sentence rules of Simplified Technical English. `bot` is the
  // practice bot's name.
  let { bot }: { bot: string } = $props();
</script>

<h2 id="practice-games">Your games against {bot}</h2>
<p>When a game against {bot} ends, the site keeps it in its own database at Cloudflare. It keeps the moves, your
  takebacks, the bot's settings, the result and the time of each move. It never keeps a name or your IP address.
  It keeps no game that ends before its first move.</p>
<p>The games show how players play against each setting of the bot, so that its levels fit real players. They also
  show what players find hard. The site can publish them as an open dataset, under CC0, as Lichess publishes its
  games. It keeps them with no time limit.</p>
<p>If you accept, a random ID in this browser goes with each of your games, so that the site can group them. The ID
  says nothing about you. Without it, nothing links one game to another. You can change this choice, and delete the
  games that went with the ID, <a href="#consent">below</a>. After a delete, the site keeps only the ID, so that it
  can refuse a game that arrives with it later.</p>
