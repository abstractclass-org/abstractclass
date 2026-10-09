<script lang="ts">
  // Home, a prototype: start a review, continue, the daily puzzle, the next lesson. Lichess's front page leads with
  // play. This site leads with review, its main job (design 01).
  import { goto } from "$app/navigation";
  import Board from "#lib/board/Board.svelte";
  import { review, PLAYER_NAME, type ReviewData } from "#lib/review/model.ts";
  import { puzzlesFrom } from "#lib/puzzles/model.ts";
  import { COURSE } from "#lib/learn/lessons.ts";
  import data from "#lib/mock/review.json";

  const R = review(data as unknown as ReviewData);
  const daily = puzzlesFrom(R)[0];
  const firstLesson = COURSE[0].lessons[0];
  let record = $state("");
</script>

<svelte:head><title>Learn Enclosure</title></svelte:head>

<main class="home">
  <section class="import">
    <h1>Review your Enclosure game</h1>
    <p>See where the game turned, which edges cost you, and what was better. The engine runs in your browser.</p>
    <form onsubmit={e => { e.preventDefault(); goto("/review"); }}>
      <label for="record">A meaf.us game link, or a game record</label>
      <div class="field">
        <input id="record" bind:value={record} placeholder="https://meaf.us/sst1/… or 1b. D10-G10 2r. N11-Q10 N8-Q9 …" />
        <button class="primary" type="submit">Review</button>
      </div>
      <p class="mock">Prototype: any input opens the sample game.</p>
    </form>
  </section>

  <div class="cards">
    <a class="card" href="/review">
      <span class="eyebrow">Continue</span>
      <strong>{R.data.players.blue} against {R.data.players.red}</strong>
      <span class="meta">{PLAYER_NAME[R.data.result.blue > R.data.result.red ? 0 : 1]} won,
        {Math.round(R.data.result.blue).toLocaleString("en")} to {Math.round(R.data.result.red).toLocaleString("en")}.
        {R.keyMoments.length} mistakes to learn from.</span>
    </a>

    <a class="card puzzle" href="/puzzles">
      <span class="eyebrow">Daily puzzle</span>
      <div class="mini"><Board position={R.data.positions[daily.index]} layers={{ regions: true, protected: true, candidates: false, marks: false, coordinates: false }} /></div>
      <span class="meta">{PLAYER_NAME[daily.player]} to play. Find the only good edge.</span>
    </a>

    <a class="card" href="/learn">
      <span class="eyebrow">Learn</span>
      <strong>Start with “{firstLesson.title}”</strong>
      <span class="meta">{COURSE[0].title}: {COURSE[0].lessons.length} short lessons on the board.</span>
    </a>
  </div>
</main>

<style>
  .home { max-width: 1000px; margin: 1.5rem auto; padding: 0 1rem; display: grid; gap: 1.25rem; }
  .import { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem 1.3rem; }
  h1 { margin: 0 0 0.3rem; font-size: 1.6rem; text-wrap: balance; }
  .import > p { color: var(--muted); margin: 0 0 1rem; max-width: 40rem; }
  label { font-size: 0.9em; font-weight: 600; }
  .field { display: flex; gap: 0.5rem; margin-top: 0.3rem; }
  input { flex: 1; min-width: 0; font: inherit; padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); }
  input:focus { outline: 2px solid var(--accent); outline-offset: 0; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.8rem; align-items: start; }
  .card { display: grid; gap: 0.35rem; padding: 0.9rem 1rem; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; color: var(--text); text-decoration: none; }
  .card:hover { border-color: var(--accent); }
  .eyebrow { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); font-weight: 600; }
  .meta { color: var(--muted); font-size: 0.9em; }
  .mini { border-radius: 4px; overflow: hidden; }
  .mock { font-size: 0.78em; color: var(--muted); margin: 0.4rem 0 0; }
</style>
