<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { EARLY_ACCESS, SITE_NAME, SITE_ORIGIN } from '#lib/edition.ts';
	import { ASKS_CONSENT, consentChosen, startAnalytics, track } from '#lib/analytics.svelte.ts';
	import { flushPractice } from '#lib/practice/send.ts';
	import { holdsGame } from '#lib/game/importHash.ts';
	import ConsentBanner from '#lib/ConsentBanner.svelte';
	import ThemeMenu from '#lib/ThemeMenu.svelte';
	import SiteMenu from '#lib/SiteMenu.svelte';
	import SupportDialog from '#lib/SupportDialog.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { startTheme } from '#lib/theme.svelte.ts';
	import Collie from '#lib/Collie.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The site map (docs/research/01-ux-survey.md, section 8). The early access has Practice, the review and the Analysis
	// board. Practice first, as Lichess's play comes first (design 22). Review opens the Review tab.
	const NAV = EARLY_ACCESS ? [{ href: '/practice', label: 'Practice' }, { href: '/review', label: 'Review' }, { href: '/analysis', label: 'Analysis' }] : [
		{ href: '/practice', label: 'Practice' },
		{ href: '/review', label: 'Review' },
		{ href: '/analysis', label: 'Analysis' },
		{ href: '/puzzles', label: 'Puzzles' },
		{ href: '/learn', label: 'Learn' },
		{ href: '/lab/engine', label: 'Engine lab' },
	];
	// The pages about the site, on the header's right. The rest are in the footer of the pages that have one. Tools
	// shows from the width of a tablet: its bookmarklet and userscript are for a computer's browser, and on a phone a
	// third row would make the header taller (design 22).
	const ABOUT = [{ href: '/tools', label: 'Tools', wide: true }, { href: '/notation', label: 'Notation' }, { href: '/about', label: 'About' }];
	const linkClass = (href: string) => ["no-underline hover:text-ink", page.url.pathname.startsWith(href) ? "text-ink" : "text-muted"];
	// Ko-fi's tip panel, in the site's own dialog (SupportDialog). Opening it counts (design 17): the tips are Ko-fi's.
	let supporting = $state(false);
	function support() {
		supporting = true;
		track('support_open');
	}

	// The visit counts start here, unless the address holds a game after its `#` (holdsGame): the page that takes it out
	// of the address starts them then (design 22). The old import page only forwards, and counts nothing. The banner
	// shows in the browser only, never in the prerendered page.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
		startTheme();
		if (page.route.id !== '/import' && !holdsGame(location.hash)) startAnalytics();
		void flushPractice(); // the practice games that could not be sent before (design 25)
	});

	// The page's own scrolling area (src/app.css, pageScroll.ts), on a screen with a mouse. The router keeps the window's
	// scroll only, so the area's is kept here, as the browser keeps a page's: each address's place, for Back, Forward
	// and a reload, and the top of a page opened anew. A link to a place in a page (`#`) scrolls to it on its own.
	// The page left is the navigation's own `from`: on Back and Forward, the address has changed already.
	let area: HTMLElement;
	const PLACES = 'hedge-school:scroll-places:1';
	const where = (url: URL | Location) => url.pathname + url.search + url.hash;
	const places = (): Record<string, number> => { try { return JSON.parse(sessionStorage.getItem(PLACES) ?? '{}'); } catch { return {}; } };
	function keepPlace(url: URL | Location) {
		try { sessionStorage.setItem(PLACES, JSON.stringify({ ...places(), [where(url)]: area.scrollTop })); } catch { /* storage blocked */ }
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

<svelte:head>
	<!-- The collie (design 12): a PNG for browsers without SVG icons, the SVG for the rest, and a square tile for iOS. -->
	<link rel="icon" href="/favicon.ico" sizes="32x32" />
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<!-- Link previews (design 23): the tags that every page shares. Each page gives its title, description and address
	     (PageMeta.svelte). The image is drawn from scripts/social-card.html. -->
	<meta property="og:site_name" content={SITE_NAME} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content="{SITE_ORIGIN}/brand/card.png" />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="Hedge School: learn Enclosure. A board with Blue's and Red's edges." />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<svelte:window onpagehide={() => keepPlace(location)} />

<!-- On a screen with a mouse, the header over the page's own scrolling area, which fills the rest of the window. -->
<div class="desktop:flex desktop:flex-col desktop:h-full print:block print:h-auto">
<!-- The gaps narrow on a phone, so that the theme menu fits in 360 pixels. Below 1,024 pixels, where the links and
     "Support Us" no longer fit in one row (they need 860 pixels), the links go into the site's menu at the left
     (SiteMenu), as on Lichess's phone pages. "Support Us" stays in the header down to 640 pixels, then goes into the
     menu too. -->
<header class="flex-none flex items-center gap-3 sm:gap-6 px-4 py-2 min-h-(--site-header) bg-panel border-b border-line">
	<span class="lg:hidden"><SiteMenu tabs={NAV} about={ABOUT} {support} /></span>
	<span class="flex items-center gap-2">
		<a class="flex items-center gap-2 text-xl font-bold text-ink no-underline" href="/">
			<Collie size={28} />{SITE_NAME}
		</a>
		<!-- The early access, in the accent colour beside the name: what it means is on the About page. -->
		{#if EARLY_ACCESS}<a class="text-xs font-semibold text-accent no-underline hover:underline" href="/about#early-access">Early Access</a>{/if}
	</span>
	<nav class="flex flex-wrap gap-4.5 max-lg:hidden">
		{#each NAV as item (item.label)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
	</nav>
	<nav class="flex flex-wrap gap-4.5 ml-auto text-sm max-lg:hidden">
		{#each ABOUT as item (item.href)}<a href={item.href} class={[linkClass(item.href), item.wide && "max-sm:hidden"]}>{item.label}</a>{/each}
	</nav>
	<!-- The accent's colour in each theme, as the site's other main buttons. -->
	<span class="flex items-center gap-3 sm:gap-6 ml-auto lg:ml-0">
		<button type="button" class="btn-primary max-sm:hidden inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold
		                             hover:brightness-110" onclick={support}><Icon name="heart" />Support Us</button>
		<ThemeMenu />
	</span>
</header>
<SupportDialog bind:open={supporting} />

<!-- The area is not in the Tab order and shows no outline (tabindex -1). It takes the focus after each navigation, so
     that the keys scroll it. It is a container (`page`): a page sized to the window takes its width from the area
     (`100cqw`), which leaves out its scroll bar's room, where `100vw` would count that room in. -->
<div id="page" bind:this={area} tabindex="-1"
     class="@container/page outline-none desktop:flex-1 desktop:min-h-0 desktop:overflow-y-auto desktop:[scrollbar-gutter:stable] print:overflow-visible">
	{@render children()}
</div>
</div>

{#if mounted && ASKS_CONSENT && !consentChosen()}<ConsentBanner />{/if}
