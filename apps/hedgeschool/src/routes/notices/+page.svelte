<script lang="ts">
  // The notices page, as on every site (packages/site's NoticesPage.svelte, design 11), with the sounds that Hedge
  // School ships.
  import NoticesPage from "@abstractclass/site/NoticesPage.svelte";
  import { SITE_COPYRIGHT, SITE_NAME } from "#lib/edition.ts";
  import SiteFooter from "#lib/SiteFooter.svelte";
  import lock from "../../../engine.lock.json" with { type: "json" };
</script>

<NoticesPage site={SITE_NAME} copyright={SITE_COPYRIGHT} engine="HedgeFund" {lock}>
  {#snippet sounds()}
    <li>The button sound of a move: "Select Button UI" by Emilianodleon
      (<a href="https://pixabay.com/sound-effects/film-special-effects-select-button-ui-395763/">Pixabay 395763</a>) and
      "Button Press" by DRAGON-STUDIO
      (<a href="https://pixabay.com/sound-effects/film-special-effects-button-press-382713/">Pixabay 382713</a>), under
      the <a href="https://pixabay.com/service/terms/">Pixabay Content License</a>.</li>
    <li>The pencil sound of a move: four strokes from "Pencil_lines" by tmkappelt
      (<a href="https://freesound.org/people/tmkappelt/sounds/85702/">Freesound 85702</a>), dedicated to the public
      domain (CC0).</li>
  {/snippet}
</NoticesPage>

<SiteFooter />
