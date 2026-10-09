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

<header class="site">
	<a class="brand" href="/">Learn Enclosure</a>
	<nav>
		{#each NAV as item (item.label)}
			{#if item.href}
				<a href={item.href} class:active={page.url.pathname.startsWith(item.href)}>{item.label}</a>
			{:else}
				<span class="soon" title="Not built yet">{item.label}</span>
			{/if}
		{/each}
	</nav>
</header>

{@render children()}

<style>
	.site {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 0.55rem 1rem;
		background: var(--panel);
		border-bottom: 1px solid var(--border);
	}
	.brand { font-weight: 700; color: var(--text); text-decoration: none; }
	nav { display: flex; gap: 1.1rem; flex-wrap: wrap; }
	nav a { color: var(--muted); text-decoration: none; }
	nav a.active, nav a:hover { color: var(--text); }
	.soon { color: var(--muted); opacity: 0.5; cursor: default; }
</style>
