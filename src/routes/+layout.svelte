<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { EARLY_ACCESS, SITE_NAME } from '#lib/edition.ts';
	import { ASKS_CONSENT, consent, startAnalytics } from '#lib/analytics.svelte.ts';
	import { holdsGame } from '#lib/game/importHash.ts';
	import ConsentBanner from '#lib/ConsentBanner.svelte';
	import ThemeMenu from '#lib/ThemeMenu.svelte';
	import { startTheme } from '#lib/theme.svelte.ts';
	import Collie from '#lib/Collie.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The site map (docs/research/01-ux-survey.md, section 8). Sections not built yet show as text. The early access has
	// the review and the Analysis board. Review opens the Review tab (design 22).
	const NAV = EARLY_ACCESS ? [{ href: '/review', label: 'Review' }, { href: '/analysis', label: 'Analysis' }] : [
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

	// The visit counts start here, unless the address holds a game after its `#` (holdsGame): the page that takes it out
	// of the address starts them then (design 22). The old import page only forwards, and counts nothing. The banner
	// shows in the browser only, never in the prerendered page.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
		startTheme();
		if (page.route.id !== '/import' && !holdsGame(location.hash)) startAnalytics();
	});
</script>

<svelte:head>
	<!-- The collie (design 12): a PNG for browsers without SVG icons, the SVG for the rest, and a square tile for iOS. -->
	<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<!-- Unlisted while in early access (design 11): the address is shared by hand. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<!-- The gaps narrow on a phone, so that the theme menu fits in 360 pixels. -->
<header class="flex items-center gap-3 sm:gap-6 px-4 py-2 min-h-(--site-header) bg-panel border-b border-line">
	<span class="flex items-center gap-2">
		<a class="flex items-center gap-2 text-xl font-bold text-ink no-underline" href="/">
			<Collie size={28} />{SITE_NAME}
		</a>
		<!-- The early access, in the accent colour beside the name: what it means is on the About page. -->
		{#if EARLY_ACCESS}<a class="text-xs font-semibold text-accent no-underline hover:underline" href="/about#early-access">Early Access</a>{/if}
	</span>
	<nav class="flex flex-wrap gap-4.5">
		{#each NAV as item (item.label)}
			{#if item.href}
				<a href={item.href} class={linkClass(item.href)}>{item.label}</a>
			{:else}
				<span class="text-muted opacity-50 cursor-default" title="Not built yet">{item.label}</span>
			{/if}
		{/each}
	</nav>
	<nav class="flex flex-wrap gap-4.5 ml-auto text-sm">
		{#each ABOUT as item (item.href)}<a href={item.href} class={[linkClass(item.href), item.wide && "max-sm:hidden"]}>{item.label}</a>{/each}
	</nav>
	<ThemeMenu />
</header>

{@render children()}

{#if mounted && ASKS_CONSENT && consent.choice === null}<ConsentBanner />{/if}
