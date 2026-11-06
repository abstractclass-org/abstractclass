<script lang="ts">
  // One logo option in the site's real header (abscls-8tl1.44). The logo lab (/lab/logos) shows this page in frames,
  // at a phone's width and at full width, in each theme. The address chooses the option and the theme:
  // ?logo=<id>&theme=light|dark. The frame's theme is not kept, so the visitor's own choice stays as it was. Under the
  // header, a button and a link in the accent show the logo beside the site's lavender.
  import { onMount } from "svelte";
  import PageMeta from "@abstractclass/site/PageMeta.svelte";
  import LogoMark from "#lib/brand/LogoMark.svelte";
  import { headerLogo } from "#lib/brand/headerLogo.svelte.ts";
  import { LOGO_OPTIONS, type LogoOption } from "#lib/brand/logoOptions.ts";
  import { SITE_NAME } from "#lib/site.ts";

  let option = $state<LogoOption | null>(null);

  onMount(() => {
    const q = new URLSearchParams(location.search);
    option = LOGO_OPTIONS.find(o => o.id === q.get("logo")) ?? null;
    if (option) headerLogo.mark = mark;
    // The frame's theme goes on after the site's frame has applied the visitor's: SiteFrame mounts after its page.
    const theme = q.get("theme");
    const apply = () => { if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme; };
    apply();
    queueMicrotask(apply);
    return () => { headerLogo.mark = null; };
  });
</script>

{#snippet mark()}{#if option}<LogoMark {option} size={28} />{/if}{/snippet}

<PageMeta title="Logo frame · {SITE_NAME}" noindex />

<main class="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
  <button type="button" class="btn-primary">Review a game</button>
  <a href="/about">About {SITE_NAME}</a>
  <span class="text-sm text-muted">The accent beside the logo</span>
</main>
