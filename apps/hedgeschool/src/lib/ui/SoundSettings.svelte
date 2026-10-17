<script lang="ts">
  // The move sounds' settings (design 08), in the review's display settings and in Practice's: on or off, which sound,
  // and the volume. A change of sound or volume plays the sound. `set` changes the page's own settings.
  import { MOVE_SOUND_NAMES, playMove, type MoveSound } from "#lib/sound.ts";
  import { SETTINGS_HEAD } from "./settings.ts";
  import SettingChoice from "./SettingChoice.svelte";
  import SettingToggle from "./SettingToggle.svelte";

  type Sound = { sound: boolean; moveSound: MoveSound; volume: number };
  let { sound, moveSound, volume, set }: Sound & { set: (v: Partial<Sound>) => void } = $props();
  const SOUND_CHOICES = Object.entries(MOVE_SOUND_NAMES) as [string, string][];
</script>

<h3 class={SETTINGS_HEAD}>Sound</h3>
<SettingToggle label="Move sounds" help="A sound for each edge played or stepped through." get={() => sound} set={v => set({ sound: v })} />
{#if SOUND_CHOICES.length > 1}
  <SettingChoice label="Sound" help="The sound of a move." options={SOUND_CHOICES} get={() => moveSound}
                 set={v => { set({ moveSound: v as MoveSound }); if (sound) void playMove(volume, v as MoveSound); }} />
{/if}
<div class="flex items-center justify-between gap-3 py-1.5">
  <label for="setting-volume" class={["text-sm font-medium", !sound && "text-muted"]}>Volume</label>
  <input id="setting-volume" type="range" min="0" max="1" step="0.05" value={volume} disabled={!sound}
         oninput={e => set({ volume: e.currentTarget.valueAsNumber })}
         onchange={e => playMove(e.currentTarget.valueAsNumber, moveSound)}
         class="w-36 accent-(--accent) disabled:opacity-50" />
</div>
