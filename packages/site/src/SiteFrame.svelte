<script lang="ts">
	// The site's frame (design 33, item 4), around every page of a site: on a screen with a mouse, the site's header
	// over the page's own scrolling area, which fills the rest of the window (site.css). Each site's root layout gives
	// what its header holds, and the site's own values:
	// - `origin`: the live site's address, the canonical address of every page (origin.ts, PageMeta.svelte).
	// - `themeKey`: the key under which this browser keeps the visitor's theme (theme.svelte.ts). The script in the
	//   site's app.html reads it too, before the page draws.
	// - `placesKey`: the key under which this tab keeps each page's scroll place.
	//
	// The router keeps the window's scroll only, so the area's is kept here, as the browser keeps a page's: each
	// address's place, for Back, Forward and a reload, and the top of a page opened anew. A link to a place in a page
	// (`#`) scrolls to it on its own. The page left is the navigation's own `from`: on Back and Forward, the address
	// has changed already.
	import { onMount, type Snippet } from 'svelte';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { setSiteOrigin } from './origin.ts';
	import { startTheme } from './theme.svelte.ts';

	let { header, children, origin, themeKey, placesKey }: {
		header: Snippet; children: Snippet; origin: string; themeKey: string; placesKey: string;
	} = $props();

	setSiteOrigin(() => origin);
	onMount(() => startTheme(themeKey));

	let area: HTMLElement;
	const where = (url: URL | Location) => url.pathname + url.search + url.hash;
	const places = (): Record<string, number> => { try { return JSON.parse(sessionStorage.getItem(placesKey) ?? '{}'); } catch { return {}; } };
	function keepPlace(url: URL | Location) {
		try { sessionStorage.setItem(placesKey, JSON.stringify({ ...places(), [where(url)]: area.scrollTop })); } catch { /* storage blocked */ }
	}
	beforeNavigate(({ from }) => { if (from) keepPlace(from.url); });
	afterNavigate(({ type, to }) => {
		if (type === 'popstate' || type === 'enter') area.scrollTop = to ? places()[where(to.url)] ?? 0 : 0;
		else if (!to?.url.hash) area.scrollTop = 0;
		// The keys that scroll (Page Down, Space, the arrows) scroll what has the focus. The router gives it to the page
		// (the body) after a navigation. The area takes it in the body's place, so that the keys scroll it, unless the
		// page has given the focus to one of its own controls.
		if (document.activeElement === document.body || !document.activeElement) area.focus({ preventScroll: true });
	});
</script>

<svelte:window onpagehide={() => keepPlace(location)} />

<div class="desktop:flex desktop:flex-col desktop:h-full print:block print:h-auto">
<!-- The header: one row, at least --site-header high (site.css), from which pages size their boards. Its gaps narrow
     on a phone, so that what it holds fits in 360 pixels. -->
<header class="flex-none flex items-center gap-3 sm:gap-6 px-4 py-2 min-h-(--site-header) bg-panel border-b border-line">
	{@render header()}
</header>
<!-- The area is not in the Tab order and shows no outline (tabindex -1). It takes the focus after each navigation, so
     that the keys scroll it. It is a container (`page`): a page sized to the window takes its width from the area
     (`100cqw`), which leaves out its scroll bar's room, where `100vw` would count that room in. -->
<div id="page" bind:this={area} tabindex="-1"
     class="@container/page outline-none desktop:flex-1 desktop:min-h-0 desktop:overflow-y-auto desktop:[scrollbar-gutter:stable] print:overflow-visible">
	{@render children()}
</div>
</div>
