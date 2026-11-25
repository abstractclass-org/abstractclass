<script lang="ts">
  // The import page (docs/design/34-tak-site.md, item 10; design 22): where a link from outside arrives. After the `#`
  // it takes a playtak game's number (`playtak=`, a parameter that its payload names), which the site's Function fetches,
  // and a record as the other sites take it (@abstractclass/import's importHash.ts): `record=`, from another site's link.
  // The game leaves the address at once, and the visit counts start after that. Until the review exists, a game that the
  // site takes shows its tags and its moves (BroughtGame.svelte), and nothing is kept. The page alone goes to the Review
  // tab, until the tools page exists. The texts are strict Simplified Technical English.
  import { onMount } from "svelte";
  import { goto, replaceState } from "$app/navigation";
  import { hashParams, holdsGame } from "@abstractclass/site/addressHash.ts";
  import { readImportHash } from "@abstractclass/import/importHash.ts";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import { startAnalytics } from "#lib/analytics.svelte.ts";
  import BroughtGame from "#lib/import/BroughtGame.svelte";
  import { bringPlaytak, bringRecord, type Brought } from "#lib/import/ways.ts";
  import { SITE_NAME } from "#lib/site.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";

  type Phase = { at: "opening" | "playtak" } | { at: "game"; brought: Brought } | { at: "refused"; why: string };
  let phase = $state.raw<Phase>({ at: "opening" });

  onMount(async () => {
    if (!holdsGame(location.hash)) return goto("/review", { replaceState: true });
    const hash = location.hash.slice(1), id = hashParams(hash)?.get("playtak") ?? null;
    if (id !== null) phase = { at: "playtak" };
    await replaceState(location.pathname, {});
    startAnalytics();
    try {
      const { record } = id === null ? readImportHash(hash) : { record: "" };
      if (id === null && !record.trim()) throw new Error("This link holds no game.");
      phase = { at: "game", brought: id === null ? bringRecord(record, false) : await bringPlaytak(id, fetch) };
    } catch (e) {
      phase = { at: "refused", why: e instanceof URIError ? "The site cannot read this link." : (e as Error).message };
    }
  });
  /** A link with a game opened in this tab: a change of the `#` alone loads nothing. */
  const linked = () => { if (holdsGame(location.hash)) location.reload(); };
</script>

<svelte:window onhashchange={linked} />

<PageMeta title={SITE_NAME} noindex /> <!-- a game that a link carries, nothing to index (design 23) -->

{#if phase.at === "game"}
  <BroughtGame brought={phase.brought}><a href="/review">Review another game</a></BroughtGame>
{:else}
  <main class="box-content max-w-184 mx-auto my-6 px-4 grid gap-4">
    {#if phase.at === "refused"}
      <h1 class="text-2xl font-bold">The site did not take this game</h1>
      <p class="[overflow-wrap:anywhere]" role="alert">{phase.why}</p>
      <p><a href="/review">Review another game</a></p>
    {:else}
      <p class="text-muted" role="status">{phase.at === "playtak" ? "Getting the game from playtak…" : `Opening ${SITE_NAME}…`}</p>
    {/if}
  </main>
  <SiteFooter />
{/if}
