<script lang="ts">
  // A setting that is on or off: its name and what it does, then a switch.
  import { Switch } from "bits-ui";
  import { SWITCH, SWITCH_THUMB, settingId } from "./settings.ts";

  let { label, help, get, set }: { label: string; help: string; get: () => boolean; set: (v: boolean) => void } = $props();
  const id = $derived(settingId(label));
</script>

<div class="flex items-start justify-between gap-3 py-1.5">
  <div class="min-w-0">
    <label for={id} class="text-sm font-medium cursor-pointer">{label}</label>
    <p class="text-xs text-muted">{help}</p>
  </div>
  <Switch.Root {id} checked={get()} onCheckedChange={set} class="{SWITCH} mt-0.5">
    <Switch.Thumb class={SWITCH_THUMB} />
  </Switch.Root>
</div>
