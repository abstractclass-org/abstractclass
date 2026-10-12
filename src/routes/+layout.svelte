<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { EARLY_ACCESS, SITE_NAME } from '#lib/edition.ts';
	import { ASKS_CONSENT, consent, startAnalytics } from '#lib/analytics.svelte.ts';
	import ConsentBanner from '#lib/ConsentBanner.svelte';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The site map (docs/research/01-ux-survey.md, section 8). Sections not built yet show as text. The early access has
	// the review only. Review opens the last game reviewed in this browser (design 11).
	const NAV = EARLY_ACCESS ? [{ href: '/review', label: 'Review' }] : [
		{ href: '/review', label: 'Review' },
		{ href: null, label: 'Analysis' },
		{ href: '/puzzles', label: 'Puzzles' },
		{ href: '/learn', label: 'Learn' },
		{ href: '/lab/engine', label: 'Engine lab' },
	];
	// The pages about the site, on the header's right. The rest are in the footer of the pages that have one.
	const ABOUT = [{ href: '/notation', label: 'Notation' }, { href: '/about', label: 'About' }];
	const linkClass = (href: string) => ["no-underline hover:text-ink", page.url.pathname.startsWith(href) ? "text-ink" : "text-muted"];

	// The visit counts start here, except on the import page, which may hold a record in the address: it starts them
	// once it has removed the record (design 11). The banner shows in the browser only, never in the prerendered page.
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
		if (page.route.id !== '/import') startAnalytics();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Unlisted while in early access (design 11): the address is shared by hand. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<header class="flex items-center gap-6 px-4 py-2 min-h-(--site-header) bg-panel border-b border-line">
	<a class="font-bold text-ink no-underline" href="/">{SITE_NAME}</a>
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
		{#each ABOUT as item (item.href)}<a href={item.href} class={linkClass(item.href)}>{item.label}</a>{/each}
	</nav>
</header>

{@render children()}

{#if mounted && ASKS_CONSENT && consent.choice === null}<ConsentBanner />{/if}
