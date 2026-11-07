<script lang="ts">
  // The Analysis board's New menu (Hedge School's design 21), beside its Export: every way to start the board again. The
  // standard start, a position set up in the board editor, a position or moves imported, or an analysis file loaded
  // (Hedge School's design 22's words). Each replaces the analysis kept here, after the board asks. A site leaves out
  // the ways it does not have yet: `editor`, the board editor's address, and `importer`, the Import's dialog and the
  // line that says what it takes. `site` names the site whose files the board loads. Its button is an icon, as
  // Export's beside it, so that the step bar's tools fit beside the steps on a phone (Hedge School's design 06, item 4).
  import { DropdownMenu } from "bits-ui";
  import Icon from "@abstractclass/site/Icon.svelte";
  let { site, editor, onstart, importer, onload }:
    { site: string; editor?: string; onstart: () => void; importer?: { open: () => void; hint: string };
      onload: (file: File) => void } = $props();

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
      {#if editor}
        <DropdownMenu.Item class="menu-item" onSelect={() => location.assign(editor)}>
          Board editor<span class="block text-xs text-muted">Set up a position, from the one on screen.</span>
        </DropdownMenu.Item>
      {/if}
      {#if importer}
        <DropdownMenu.Item class="menu-item" onSelect={importer.open}>
          Import a position or moves…<span class="block text-xs text-muted">{importer.hint}</span>
        </DropdownMenu.Item>
      {/if}
      <DropdownMenu.Item class="menu-item" onSelect={() => fileInput?.click()}>
        Load an analysis file…<span class="block text-xs text-muted">A file that {site} exported: it opens with its results.</span>
      </DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
<input bind:this={fileInput} type="file" accept=".json,application/json" class="hidden"
       onchange={e => { const f = e.currentTarget.files?.[0]; e.currentTarget.value = ""; if (f) onload(f); }} />
