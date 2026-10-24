import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// Drawing Board, Blueprints' site (docs/design/33-drawing-board.md), on Hedge School's build (apps/hedgeschool).

// The site's version: the commit it is built from (Cloudflare's build names it, else Git), for the footer.
const commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA
	?? (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

export default defineConfig({
	define: { __SITE_VERSION__: JSON.stringify(commit.slice(0, 7)) },
	plugins: [
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
