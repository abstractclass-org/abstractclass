<script lang="ts">
  // The points bar's settings, first in Practice's display settings (Hedge School's design 24, item 12): the bar on or
  // off, and while it is on, the area (only for a game that offers it) and the direction.
  import SettingChoice from "@abstractclass/site/SettingChoice.svelte";
  import SettingToggle from "@abstractclass/site/SettingToggle.svelte";
  import { SETTINGS_HEAD } from "@abstractclass/site/settings.ts";
  import type { ScoreDisplay } from "./practice.ts";

  interface Props {
    score: ScoreDisplay;
    area: boolean; // the game offers the area's lane
    set: (change: Partial<ScoreDisplay>) => void;
  }
  let { score, area, set }: Props = $props();
</script>

<h3 class={SETTINGS_HEAD}>Score</h3>
<SettingToggle label="Points bar" help="Each player's share of the points so far."
               get={() => score.bar} set={v => set({ bar: v })} />
{#if score.bar}
  {#if area}
    <SettingToggle label="Area" help="A second lane: each player's area against their own points, under their part of the bar."
                   get={() => score.area} set={v => set({ area: v })} />
  {/if}
  <SettingChoice label="Direction" help="Above the board, or beside it."
                 options={[["bar", "Horizontal"], ["gauge", "Vertical"]]} get={() => score.form}
                 set={v => set({ form: v as ScoreDisplay["form"] })} />
{/if}
