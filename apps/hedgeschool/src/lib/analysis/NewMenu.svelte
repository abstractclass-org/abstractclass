<script lang="ts">
  // The Analysis board's New menu (design 21), beside its Export: every way to start the board again. The standard
  // start, a position set up in the board editor, a position or moves imported, or an analysis file loaded (design
  // 22's words). Each replaces the analysis kept here, after the board asks. Its button is an icon, as Export's beside
  // it, so that the step bar's tools fit beside the steps on a phone (design 06, item 4).
  import { DropdownMenu } from "bits-ui";
  import Icon from "#lib/ui/Icon.svelte";
  let { editor, onstart, onimport, onload }:
    { editor: string; onstart: () => void; onimport: () => void; onload: (file: File) => void } = $props();

  let fileInput = $state<HTMLInputElement>();
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger class="btn-icon data-[state=open]:border-accent data-[state=open]:text-accent" aria-label="New"
                        title="New"><Icon name="new" /></DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content side="top" align="end" sideOffset={4}
                          class="z-10 min-w-72 max-w-[90vw] menu-box">
      <DropdownMenu.Item class="menu-item" onSelect={onstart}>
        Standard start<span class="block text-xs text-muted">A new analysis from the game's start.</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item class="menu-item" onSelect={() => location.assign(editor)}>
        Board editor<span class="block text-xs text-muted">Set up a position, from the one on screen.</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item class="menu-item" onSelect={onimport}>
        Import a position or moves…<span class="block text-xs text-muted">A game record, finished or not, a list of edges, or a position.</span>
      </DropdownMenu.Item>
      <DropdownMenu.Item class="menu-item" onSelect={() => fileInput?.click()}>
        Load an analysis file…<span class="block text-xs text-muted">A file that Hedge School exported: it opens with its results.</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
<input bind:this={fileInput} type="file" accept=".json,application/json" class="hidden"
       onchange={e => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) onload(f); }} />
