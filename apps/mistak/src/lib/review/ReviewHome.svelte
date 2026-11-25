<script lang="ts">
  // The Review tab without a game (docs/design/34-tak-site.md, item 10; Hedge School's design 22), as Hedge School's and
  // Cyanotype's: one box and its button. The box takes a link to a playtak game, a PTN Ninja link or PTN (ways.ts tells
  // them apart). A game that the site does not take shows why under the box, and the text stays, so that the player can
  // correct it. The box's border is then red and the reason is in the text's own colour: the shared red is too light for
  // small text, and the review's darker red comes with the review's style. A review file, the last review and the
  // player's games come with the review. The heading and its line invite: plain web writing. The form's texts are
  // followed: strict Simplified Technical English.
  import { ENGINE_NAME, SITE_NAME } from "#lib/site.ts";
  import { bringGame, readWay, type Brought } from "#lib/import/ways.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  let { onbring }: { onbring: (brought: Brought) => void } = $props(); // the game that the site took

  const EXAMPLE = '[Size "6"]\n[Komi "2"]\n1. a1 f6\n2. c3 d4 …';
  let text = $state(""), problem = $state(""), busy = $state(false);

  /** Whether the text is a game that another site holds, so that the button says what it waits for. */
  const asks = $derived.by(() => {
    try { return ["playtak", "short"].includes(readWay(text).way); } catch { return false; }
  });

  async function review(event: SubmitEvent) {
    event.preventDefault();
    if (busy) return;
    problem = "";
    busy = true;
    try {
      onbring(await bringGame(text, fetch));
    } catch (e) {
      problem = (e as Error).message;
    } finally {
      busy = false;
    }
  }
</script>

<main class="box-content max-w-[1000px] mx-auto my-6 px-4 grid gap-5">
  <section class="bg-panel border border-line rounded-lg px-5 py-5">
    <h1 class="mb-1 text-2xl font-bold text-balance">Review your Tak game</h1>
    <p class="mb-4 max-w-160 text-muted">See where the game turned, which moves cost you, and what was better. The review
      comes with {ENGINE_NAME}, our engine. For now, {SITE_NAME} shows what it reads in your game.</p>
    <form onsubmit={review}>
      <label for="game" class="block mb-1 text-sm font-semibold">A link to a game, or a game record</label>
      <textarea id="game" rows="4" bind:value={text} oninput={() => (problem = "")} spellcheck="false" autocomplete="off"
                aria-describedby="game-hint" aria-invalid={problem !== ""}
                class="w-full px-2.5 py-2 font-mono text-sm/[1.4] bg-page text-ink border border-line aria-invalid:border-red rounded resize-y focus:outline-2 focus:outline-accent"
                placeholder={EXAMPLE}></textarea>
      {#if problem}<p class="mt-1.5 text-sm font-medium [overflow-wrap:anywhere]" role="alert">{problem}</p>{/if}
      <div class="flex flex-wrap items-center gap-3 mt-2">
        <button class="btn-primary" type="submit" disabled={!text.trim() || busy}>{busy && asks ? "Getting the game…" : "Review"}</button>
        <span id="game-hint" class="flex-1 min-w-56 text-xs text-muted">Paste a link to a finished game on playtak.com, a
          PTN Ninja link, or the game's record in <a href="/notation">PTN</a>.</span>
      </div>
    </form>
  </section>
</main>

<SiteFooter />
