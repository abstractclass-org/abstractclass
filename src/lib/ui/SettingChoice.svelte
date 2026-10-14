<script lang="ts">
  // A choice of a few: its name and what it does, then the options side by side.
  import { RadioGroup } from "bits-ui";

  let { label, help, options, get, set }:
    { label: string; help: string; options: [string, string][]; get: () => string; set: (v: string) => void } = $props();
</script>

<div class="py-1.5">
  <p class="text-sm font-medium">{label}</p>
  {#if help}<p class="mb-1 text-xs text-muted">{help}</p>{/if}
  <RadioGroup.Root value={get()} onValueChange={set} orientation="horizontal" aria-label={label}
                   style="grid-template-columns: repeat({options.length}, minmax(0, 1fr))"
                   class="grid gap-0.5 p-0.5 rounded-md border border-line bg-panel-2">
    {#each options as [value, text] (value)}
      <RadioGroup.Item {value} class="px-2 py-1 text-sm rounded border-0 bg-transparent hover:bg-panel
                                      data-[state=checked]:bg-accent data-[state=checked]:text-on-accent data-[state=checked]:font-medium">{text}</RadioGroup.Item>
    {/each}
  </RadioGroup.Root>
</div>
