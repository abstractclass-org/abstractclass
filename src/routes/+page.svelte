<script lang="ts">
  // Home: import a game, the player's games, the sample game, the daily puzzle, the next lesson. Lichess's front page
  // leads with play. This site leads with review, its main job (design 01).
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import Board from "#lib/board/Board.svelte";
  import { review, PLAYER_NAME, type ReviewData } from "#lib/review/model.ts";
  import { puzzlesFrom } from "#lib/puzzles/model.ts";
  import { COURSE } from "#lib/learn/lessons.ts";
  import { markCuts, parseRecord, RecordError, type GameRecord } from "#lib/game/record.ts";
  import { listGames, saveGame, type StoredGame } from "#lib/game/store.ts";
  import { checkMoves } from "#lib/game/check.ts";
  import data from "#lib/mock/review.json";

  const R = review(data as unknown as ReviewData);
  const daily = puzzlesFrom(R)[0];
  const firstLesson = COURSE[0].lessons[0];

  let text = $state("");
  let problem = $state("");
  let checking = $state(false);
  let games = $state<{ game: StoredGame; record: GameRecord }[]>([]);
  onMount(async () => { games = await listGames(); });

  /** Where in the text: line and column, from the record reader's offset. */
  function where(offset: number) {
    const before = text.slice(0, offset).split("\n");
    return `line ${before.length}, column ${before.at(-1)!.length + 1}`;
  }

  async function importGame(event: SubmitEvent) {
    event.preventDefault();
    problem = "";
    let record: GameRecord;
    try {
      record = parseRecord(text);
    } catch (e) {
      problem = e instanceof RecordError ? `${e.message} (${where(e.offset)}).` : String(e);
      return;
    }
    checking = true;
    const { problem: illegal, cuts } = await checkMoves(record).finally(() => (checking = false));
    if (illegal) { problem = illegal; return; }
    // The record is kept with a cut mark on every move that cuts, as the notation asks.
    const { id, kept } = await saveGame(cuts ? markCuts(text, record, cuts) : text, record);
    if (!kept) { problem = "This browser does not let the site keep games (a private window, or blocked site data)."; return; }
    await goto(`/review?game=${id}`);
  }

  const title = (r: GameRecord) => `${r.tags.Blue && r.tags.Blue !== "?" ? r.tags.Blue : "Blue"} against ${r.tags.Red && r.tags.Red !== "?" ? r.tags.Red : "Red"}`;
</script>

<svelte:head><title>Learn Enclosure</title></svelte:head>

<main class="home">
  <section class="import">
    <h1>Review your Enclosure game</h1>
    <p>See where the game turned, which edges cost you, and what was better. The engine runs in your browser.</p>
    <form onsubmit={importGame}>
      <label for="record">A game record</label>
      <textarea id="record" rows="4" bind:value={text} spellcheck="false"
                placeholder={'[Blue "you"] [Red "them"]\n1. D10-G10 2. N11-Q10 L10-N11 3. D10-G9 G9-H10 …'}></textarea>
      {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
      <div class="row">
        <button class="primary" type="submit" disabled={!text.trim() || checking}>{checking ? "Checking…" : "Review"}</button>
        <span class="hint">In the engine's notation: turns as <code>1.</code> and <code>2.</code>, edges as
          <code>D10-G10</code>, a cut as <code>D10-G10x</code>, a timeout as <code>pass</code>. A plain list of edges works too.</span>
      </div>
      <p class="hint from-meaf">From meaf.us: use the <a href="/import">bookmarklet</a>, one click on a meaf.us game page.</p>
    </form>
  </section>

  {#if games.length}
    <section class="games">
      <h2>Your games</h2>
      <ul>
        {#each games as { game, record } (game.id)}
          <li>
            <a href="/review?game={game.id}">{title(record)}</a>
            <span class="meta">{record.moves.length} edges{record.result && record.result !== "*" ? ` · ${record.result}` : ""} ·
              imported {new Date(game.added).toLocaleDateString()}</span>
          </li>
        {/each}
      </ul>
      <p class="meta">Kept in this browser only.</p>
    </section>
  {/if}

  <div class="cards">
    <a class="card" href="/review">
      <span class="eyebrow">Sample game</span>
      <strong>{R.data.players.blue} against {R.data.players.red}</strong>
      <span class="meta">A bot game. {PLAYER_NAME[R.data.result.blue > R.data.result.red ? 0 : 1]} won,
        {Math.round(R.data.result.blue).toLocaleString("en")} to {Math.round(R.data.result.red).toLocaleString("en")}.</span>
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
  .import, .games { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem 1.3rem; }
  h1 { margin: 0 0 0.3rem; font-size: 1.6rem; text-wrap: balance; }
  h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
  .import > p { color: var(--muted); margin: 0 0 1rem; max-width: 40rem; }
  label { font-size: 0.9em; font-weight: 600; display: block; margin-bottom: 0.3rem; }
  textarea { width: 100%; box-sizing: border-box; font: 0.92em/1.4 ui-monospace, monospace; padding: 0.5rem 0.6rem;
             border: 1px solid var(--border); border-radius: 4px; background: var(--bg); color: var(--text); resize: vertical; }
  textarea:focus { outline: 2px solid var(--accent); outline-offset: 0; }
  .row { display: flex; gap: 0.8rem; align-items: center; flex-wrap: wrap; margin-top: 0.5rem; }
  .hint { color: var(--muted); font-size: 0.85em; flex: 1; min-width: 14rem; }
  code { font-size: 0.95em; }
  .problem { color: var(--blunder); margin: 0.4rem 0 0; }
  .from-meaf { margin: 0.6rem 0 0; }
  .games ul { list-style: none; padding: 0; margin: 0 0 0.4rem; display: grid; gap: 0.3rem; }
  .games li { display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: baseline; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0.8rem; align-items: start; }
  .card { display: grid; gap: 0.35rem; padding: 0.9rem 1rem; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; color: var(--text); text-decoration: none; }
  .card:hover { border-color: var(--accent); }
  .eyebrow { font-size: 0.75em; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); font-weight: 600; }
  .meta { color: var(--muted); font-size: 0.9em; }
  .mini { border-radius: 4px; overflow: hidden; }
</style>
