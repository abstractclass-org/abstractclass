<script lang="ts">
  // The title and the first paragraph of the sites' pages for developers (Hedge School's design 18, Cyanotype's design
  // 33, "Partner sites", item 9). The sections that follow are in this folder, and each site's page puts them in order.
  // `site` is the site's name, and `game` the game that it reviews.
  let { site, game }: { site: string; game: string } = $props();
</script>

<h1>For developers</h1>
<p>A site where people play {game} can send its games to {site} for review, or to its Analysis board, and a
  partner site can keep the reviews and open them again. This page describes how. The game goes as a game record, in
  <a href="/notation">the notation</a>.</p>
