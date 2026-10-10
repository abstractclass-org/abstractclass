<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// The site map (docs/research/01-ux-survey.md, section 8). Sections not built yet show as text.
	const NAV = [
		{ href: '/review', label: 'Review' },
		{ href: null, label: 'Analysis' },
		{ href: '/puzzles', label: 'Puzzles' },
		{ href: '/learn', label: 'Learn' },
		{ href: '/lab/engine', label: 'Engine lab' },
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="flex items-center gap-6 px-4 py-2 min-h-(--site-header) bg-panel border-b border-line">
	<a class="font-bold text-ink no-underline" href="/">Learn Enclosure</a>
	<nav class="flex flex-wrap gap-4.5">
		{#each NAV as item (item.label)}
			{#if item.href}
				<a href={item.href} class={["no-underline hover:text-ink", page.url.pathname.startsWith(item.href) ? "text-ink" : "text-muted"]}>{item.label}</a>
			{:else}
				<span class="text-muted opacity-50 cursor-default" title="Not built yet">{item.label}</span>
			{/if}
		{/each}
	</nav>
</header>

{@render children()}
