<script lang="ts">
  // Tips through Ko-fi (design 22): the header's "Support Us" opens Ko-fi's tip panel in this dialog, so that a tip
  // needs no other tab. The panel is Ko-fi's own page in a frame (Ko-fi's donation panel widget), made only while the
  // dialog is open: until a visitor opens it, nothing goes to Ko-fi, and no script of Ko-fi's runs in the site's pages.
  // Ko-fi's floating widget is a script on every page, with a button of its own at a fixed place, and only its text and
  // colours to set. The frame's inside is Ko-fi's, and keeps Ko-fi's colours in both themes.
  import { Dialog } from "bits-ui";
  import { KOFI, SITE_NAME } from "#lib/edition.ts";
  import Icon from "#lib/ui/Icon.svelte";

  let { open = $bindable(false) }: { open?: boolean } = $props();
  // Ko-fi's own address for the panel, from its widget page.
  const PANEL = `${KOFI}/?hidefeed=true&widget=true&embed=true&preview=true`;
  let loaded = $state(false);
</script>

<Dialog.Root bind:open onOpenChange={o => { if (!o) loaded = false; }}>
  <Dialog.Portal>
    <Dialog.Overlay class="dialog-overlay" />
    <Dialog.Content class="dialog-box w-[min(94vw,26rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
      <div class="flex items-start justify-between gap-3">
        <Dialog.Title class="font-semibold">Support {SITE_NAME}</Dialog.Title>
        <Dialog.Close class="btn-icon -mt-1 -mr-2" aria-label="Close" title="Close"><Icon name="abort" /></Dialog.Close>
      </div>
      <Dialog.Description class="mb-3 text-sm text-muted">{SITE_NAME} is free. If it helps you, a tip through Ko-fi helps
        it grow.</Dialog.Description>
      <!-- Ko-fi's background (#f9f9f9) under the frame, so that the frame's edge does not show while it loads. The
           frame's height is Ko-fi's own. -->
      <div class="relative rounded-md overflow-hidden bg-[#f9f9f9]">
        {#if !loaded}<p class="absolute inset-x-0 top-24 text-center text-sm text-[#555]">Loading Ko-fi's tip panel</p>{/if}
        <iframe src={PANEL} title="Ko-fi's tip panel for {SITE_NAME}" height="712"
                class={["block w-full p-1 border-0 transition-opacity", loaded ? "opacity-100" : "opacity-0"]}
                onload={() => (loaded = true)}></iframe>
      </div>
      <!-- Below the panel: the tip comes first, and the note is for the few who look for it. -->
      <p class="mt-3 text-xs text-muted">The panel is Ko-fi's, under <a href="https://more.ko-fi.com/privacy">its privacy
        policy</a>. If it does not show, <a href={KOFI} target="_blank" rel="noopener">open the page on Ko-fi</a>.</p>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
