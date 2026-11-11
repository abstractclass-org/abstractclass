<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { EARLY_ACCESS, ENGINE_FILES, OPENINGS, SITE_NAME, SITE_ORIGIN } from '#lib/edition.ts';
	import { ASKS_CONSENT, analytics, consentChosen, startAnalytics, track } from '#lib/analytics.svelte.ts';
	import { flushPractice } from '#lib/practice/send.ts';
	import { removeUnreadResults } from '@abstractclass/analysis/cache.ts';
	import { holdsGame } from '@abstractclass/import/importHash.ts';
	import ConsentBanner from '@abstractclass/site/ConsentBanner.svelte';
	import ThemeMenu from '@abstractclass/site/ThemeMenu.svelte';
	import SiteMenu from '@abstractclass/site/SiteMenu.svelte';
	import SupportDialog from '#lib/SupportDialog.svelte';
	import Icon from '@abstractclass/site/Icon.svelte';
	import SiteFrame from '@abstractclass/site/SiteFrame.svelte';
	import SiteName from '@abstractclass/site/SiteName.svelte';
	import SiteHead from '@abstractclass/site/SiteHead.svelte';
	import Collie from '#lib/Collie.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The site map (docs/research/01-ux-survey.md, section 8). The early access has Practice, the review and the Analysis
	// board, and Openings after Analysis where the build has it (design 32, edition.ts). Practice first, as Lichess's
	// play comes first (design 22). Review opens the Review tab.
	const NAV = EARLY_ACCESS ? [{ href: '/practice', label: 'Practice' }, { href: '/review', label: 'Review' }, { href: '/analysis', label: 'Analysis' },
		...(OPENINGS ? [{ href: '/openings', label: 'Openings' }] : [])] : [
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
	// never in the prerendered page.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
		if (page.route.id !== '/import' && !holdsGame(location.hash)) startAnalytics();
		void flushPractice(); // the practice games that could not be sent before (design 25)
		// The stored analyses that no reader reads: once after a change of their shape, and an earlier engine's that no
		// stored game needs, once after a change of the engine or of what the games need (design 20). The removal's code
		// loads only then, when the page is idle.
		removeUnreadResults(ENGINE_FILES, () => import('#lib/game/earlierResults.ts'));
	});
</script>

<!-- The icons, the collie (design 12), and the link previews' tags that every page shares (design 23). The preview
     picture is drawn from scripts/social-card.html. -->
<SiteHead {favicon} name={SITE_NAME} origin={SITE_ORIGIN}
          imageAlt="Hedge School: learn Enclosure. A board with Blue's and Red's edges." />

<!-- The site's frame (SiteFrame): on a screen with a mouse, the header over the page's own scrolling area, which fills
     the rest of the window (site.css, pageScroll.ts). The theme's key is also in src/app.html. -->
<SiteFrame origin={SITE_ORIGIN} themeKey="hedge-school:theme:1" placesKey="hedge-school:scroll-places:1">
{#snippet header()}
	<!-- The header's gaps narrow on a phone, so that the theme menu fits in 360 pixels. Below 1,024 pixels, where the
	     links and "Support Us" no longer fit in one row (they need 860 pixels), the links go into the site's menu at the
	     left (SiteMenu), as on Lichess's phone pages. "Support Us" stays in the header down to 640 pixels, then goes into
	     the menu too. -->
	<span class="lg:hidden"><SiteMenu tabs={NAV} about={ABOUT} {support} /></span>
	<!-- The name, and the early access in the accent colour beside it: what it means is on the About page (SiteName). -->
	<SiteName><Collie size={28} />{SITE_NAME}</SiteName>
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
{/snippet}
	{@render children()}
</SiteFrame>
<SupportDialog bind:open={supporting} />

<!-- The card's collie, at 48 pixels: its head and chest (design 12). -->
{#snippet collie()}<Collie size={48} />{/snippet}
{#if mounted && ASKS_CONSENT && !consentChosen()}<ConsentBanner {analytics} site={SITE_NAME} title="Help the school get better" mark={collie} />{/if}
