<script lang="ts">
  // The import page (docs/design/34-tak-site.md, item 10; Hedge School's design 22): a game that comes in from outside.
  // After the `#` it takes a playtak game's number (`playtak=`, a parameter that its payload names), which the site's
  // Function fetches, and a record as the other sites take it (@abstractclass/import's importHash.ts): `record=`, from the
  // Import dialog or another site's link. The game leaves the address at once, and the visit counts start after that.
  // The page alone holds the import's form. Until the review exists, a game that the site takes shows its tags and its
  // moves (BroughtGame.svelte), and nothing is kept. The texts are strict Simplified Technical English.
  import { onMount } from "svelte";
  import { replaceState } from "$app/navigation";
  import { hashParams, holdsGame } from "@abstractclass/site/addressHash.ts";
  import { readImportHash } from "@abstractclass/import/importHash.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { startAnalytics } from "#lib/analytics.svelte.ts";
  import BroughtGame from "#lib/import/BroughtGame.svelte";
  import ImportForm from "#lib/import/ImportForm.svelte";
  import { bringPlaytak, bringRecord, type Brought } from "#lib/import/ways.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  // The form holds the text that the site did not take, with why, so that the player can correct it.
  type Phase = { at: "form"; start: string; refused: string } | { at: "reading"; id: string | null } | { at: "game"; brought: Brought };
  const FORM = { at: "form", start: "", refused: "" } as const;
  let phase = $state.raw<Phase>(FORM);

  onMount(async () => {
    if (!holdsGame(location.hash)) return;
    const hash = location.hash.slice(1), id = hashParams(hash)?.get("playtak") ?? null;
    phase = { at: "reading", id };
    await replaceState(location.pathname, {});
    startAnalytics();
    let start = id ?? "";
    try {
      if (id === null) {
        start = readImportHash(hash).record;
        if (!start.trim()) throw new Error("This link holds no game.");
      }
      phase = { at: "game", brought: id === null ? bringRecord(start, true) : await bringPlaytak(id, fetch) };
    } catch (e) {
      phase = { at: "form", start, refused: e instanceof URIError ? "The site cannot read this link." : (e as Error).message };
    }
  });
  /** A link with a game opened in this tab: a change of the `#` alone loads nothing. */
  const linked = () => { if (holdsGame(location.hash)) location.reload(); };
  const show = (brought: Brought) => { phase = { at: "game", brought }; };
</script>

<svelte:window onhashchange={linked} />

<PageMeta title="Import a game: {SITE_NAME}" noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

<main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
  {#if phase.at === "reading"}
    <p class="text-muted" role="status">{phase.id ? "Getting the game from playtak…" : "Reading the game…"}</p>
  {:else if phase.at === "game"}
    <BroughtGame brought={phase.brought} />
    <p><button type="button" onclick={() => (phase = FORM)}>Import another game</button></p>
  {:else}
    <h1 class="text-2xl font-bold">Import a game</h1>
    <!-- A new form for each phase: its first text is the phase's. -->
    {#key phase}<ImportForm start={phase.start} refused={phase.refused} onimport={show} />{/key}
  {/if}
</main>

<SiteFooter />
