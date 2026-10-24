<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { EARLY_ACCESS, ENGINE_FILES, SITE_NAME, SITE_ORIGIN } from '#lib/edition.ts';
	import { ASKS_CONSENT, asksToAllow, consentChosen, startAnalytics, track } from '#lib/analytics.svelte.ts';
	import { flushPractice } from '#lib/practice/send.ts';
	import { earlierRemovalDue, removeOlderShapes } from '@abstractclass/analysis/cache.ts';
	import { holdsGame } from '#lib/game/importHash.ts';
	import ConsentBanner from '#lib/ConsentBanner.svelte';
	import AnalyticsAsk from '#lib/AnalyticsAsk.svelte';
	import ThemeMenu from '@abstractclass/site/ThemeMenu.svelte';
	import SiteMenu from '#lib/SiteMenu.svelte';
	import SupportDialog from '#lib/SupportDialog.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import { startTheme } from '@abstractclass/site/theme.svelte.ts';
	import { setSiteOrigin } from '@abstractclass/site/origin.ts';
	import SiteFrame from '@abstractclass/site/SiteFrame.svelte';
	import Collie from '#lib/Collie.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
	setSiteOrigin(SITE_ORIGIN);

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
	// of the address starts them then (design 22). The import page alone goes to the tools, and counts nothing: with a
	// game, its arrival step starts them, as the review's does (Arrival.svelte). The banner shows in the browser only,
	// never in the prerendered page. After the banner, in its place, the ask to allow Google Analytics in a blocker shows
	// when the visitor accepted Google Analytics and its tag did not run (design 27).
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
		startTheme('hedge-school:theme:1'); // also in src/app.html
		if (page.route.id !== '/import' && !holdsGame(location.hash)) startAnalytics();
		void flushPractice(); // the practice games that could not be sent before (design 25)
		void removeOlderShapes(); // the stored analyses that no reader reads, once after a change of their shape
		// An earlier engine's results that no stored game needs, once after a change of the engine or of what the games
		// need. Its code loads only then, when the page is idle: its transaction would hold the page's own reads of the
		// store. A load or a removal that fails leaves it due, for a later start.
		if (earlierRemovalDue(ENGINE_FILES)) {
			const remove = () => void import('#lib/game/earlierResults.ts').then(m => m.removeEarlierResults(ENGINE_FILES)).catch(() => {});
			if ('requestIdleCallback' in window) requestIdleCallback(remove, { timeout: 10_000 });
			else setTimeout(remove, 2_000); // Safari
		}
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

<!-- On a screen with a mouse, the header over the page's own scrolling area, which fills the rest of the window
     (SiteFrame, src/app.css, pageScroll.ts). This tab keeps each page's scroll place under the key placesKey. -->
<SiteFrame placesKey="hedge-school:scroll-places:1">
{#snippet header()}
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
{/snippet}
	{@render children()}
</SiteFrame>

{#if mounted && ASKS_CONSENT && !consentChosen()}<ConsentBanner />{:else if asksToAllow()}<AnalyticsAsk />{/if}
