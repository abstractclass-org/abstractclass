import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { analyticsTokenCheck } from '@abstractclass/site/analyticsTokens.ts';

// Mistak, Tak's site (docs/design/34-tak-site.md), on Hedge School's and Cyanotype's build (apps/cyanotype).

// The site's version: the commit it is built from (Cloudflare's build names it, else Git), for the footer.
const commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA
	?? (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

// The site's address, for what leaves the site and comes back to it, as Cyanotype's: the tools for playtak's pages
// (design 34, "The tools for playtak's pages") will update from it and open their games there. The deploy's build of
// main (.github/workflows/deploy.yml, which sets Cloudflare's build variables) is the live site, a build of another
// branch its preview, and a local build the local preview server. SITE_ORIGIN sets another.
const origin = process.env.SITE_ORIGIN
	?? (process.env.CF_PAGES_BRANCH === 'main' ? 'https://mistak.abstractclass.org'
		: process.env.CF_PAGES_URL ?? 'http://127.0.0.1:4173');

export default defineConfig({
	define: { __SITE_VERSION__: JSON.stringify(commit.slice(0, 7)), __SITE_ORIGIN__: JSON.stringify(origin) },
	plugins: [
		// A malformed analytics token stops the build.
		analyticsTokenCheck(),
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// 404.html: the page for an address the site does not have. Without it, Cloudflare Pages would serve the
			// home page for any address (its rule for single-page applications).
			adapter: adapter({ fallback: '404.html' })
		})
	]
});
