<script lang="ts">
  // The privacy page's "Your choices" (Hedge School's design 25), in a build that asks for consent: the switch of the
  // consent's one purpose, the games' link, and while this browser has a random ID, "Delete my practice games" for the
  // games sent with it. Only a build that stores practice games gives the analytics the games' keys, so only such a
  // build reads a random ID (analytics.keptNumber). The delete asks first (ConfirmDialog): the player cannot undo it.
  // The switch shows in the browser only: the prerendered page cannot know the choice. `bot` is the practice bot's name,
  // and `ondelete` the site's delete (send.ts, deletePractice), which answers the count of games deleted.
  import { onMount } from "svelte";
  import { Switch } from "bits-ui";
  import type { Analytics, Purpose } from "@abstractclass/site/analytics.svelte.ts";
  import { errorText } from "@abstractclass/engine/errors.ts";
  import { SWITCH, SWITCH_THUMB } from "@abstractclass/site/settings.ts";
  import ConfirmDialog, { type Answer } from "@abstractclass/site/ConfirmDialog.svelte";

  let { analytics, site, bot, ondelete }:
    { analytics: Analytics; site: string; bot: string; ondelete: (browser: string) => Promise<number> } = $props();

  let mounted = $state(false), number = $state<string | null>(null), deleting = $state(false), deleted = $state("");
  onMount(() => { mounted = true; number = analytics.keptNumber(); });
  const LABEL: Record<Purpose, string> = {
    games: "Group my games against bots with a random ID in this browser",
  };
  let asking = $state(false);
  async function answerDelete(answer: Answer) {
    asking = false;
    if (answer !== "yes" || !number) return;
    deleting = true;
    try {
      const n = await ondelete(number);
      number = null;
      deleted = `Deleted ${n} ${n === 1 ? "game" : "games"}.`;
    } catch (e) {
      deleted = `The site deleted no games: ${errorText(e)}. Try again later.`;
    } finally {
      deleting = false;
    }
  }
</script>

{#if analytics.asksConsent}
  <h2 id="consent">Your choices</h2>
  <p>The banner's Accept and Decline set this choice. You can change it here at any time.</p>
  {#if mounted}
    <div class="grid gap-3">
      {#each analytics.purposes as p (p)}
        <label class="flex items-center gap-3 text-sm">
          <Switch.Root class={SWITCH} checked={analytics.consent[p] === "granted"}
                       onCheckedChange={on => analytics.chooseShown(p, on ? "granted" : "denied")}>
            <Switch.Thumb class={SWITCH_THUMB} />
          </Switch.Root>
          <span>{LABEL[p]}{analytics.consent[p] === null ? " (not chosen yet)" : ""}</span>
        </label>
      {/each}
    </div>
    {#if number}
      <p>Your games against {bot} went with this browser's random ID.
        <button type="button" class="ml-1" disabled={deleting}
                onclick={() => (asking = true)}>Delete my practice games</button></p>
    {/if}
    {#if deleted}<p role="status">{deleted}</p>{/if}
  {/if}
{/if}

{#if number}
  <ConfirmDialog open={asking} title="Delete your practice games?" action="Delete" onanswer={answerDelete}>
    <div class="grid gap-2">
      <p>{site} will delete these items:</p>
      <ul class="grid gap-1.5 pl-4 list-disc">
        <li>In the site's database: the games against {bot} that went with this browser's random ID.</li>
        <li>In this browser: the games with this random ID that wait to go to the database.</li>
        <li>In this browser, after the site deletes the games: the random ID.</li>
      </ul>
      <p>Your games in the Review tab stay in this browser. You cannot undo this action.</p>
    </div>
  </ConfirmDialog>
{/if}
