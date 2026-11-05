import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// Cyanotype, Blueprints' site (docs/design/33-cyanotype.md), on Hedge School's build (apps/hedgeschool).

// The site's version: the commit it is built from (Cloudflare's build names it, else Git), for the footer.
const commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA
	?? (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

// The site's address, for what leaves the site and comes back to it: the userscript, which updates from it and opens
// the import page there (src/lib/game/tools.ts), as Hedge School's. The deploy's build of main
// (.github/workflows/deploy.yml, which sets Cloudflare's build variables) is the live site, a build of another branch
// its preview, and a local build the local preview server. SITE_ORIGIN sets another.
const origin = process.env.SITE_ORIGIN
	?? (process.env.CF_PAGES_BRANCH === 'main' ? 'https://cyanotype.abstractclass.org'
		: process.env.CF_PAGES_URL ?? 'http://127.0.0.1:4173');

// The userscript's versions (src/lib/game/tools.ts), as Hedge School's. For Tampermonkey: the build's time (UTC), which
// grows with each build. For the import page: a hash of the files that make its code (its frame in packages/import,
// and Cyanotype's page code), so that it tells a player of an out-of-date userscript only when that code changed.
const now = new Date(), pad = (n: number) => String(n).padStart(2, '0');
const userscriptVersion = `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}.${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const userscriptCode = createHash('sha256')
	.update(['../../packages/import/src/userscript.ts', '../../packages/import/src/pageCode.ts',
		...['tools.ts', 'strategyjamPage.ts', 'strategyjam.ts'].map(f => `src/lib/game/${f}`)]
		.map(f => readFileSync(f, 'utf8')).join('\0'))
	.digest('hex').slice(0, 12);

export default defineConfig({
	define: {
		__SITE_VERSION__: JSON.stringify(commit.slice(0, 7)), __SITE_ORIGIN__: JSON.stringify(origin),
		__USERSCRIPT_VERSION__: JSON.stringify(userscriptVersion), __USERSCRIPT_CODE__: JSON.stringify(userscriptCode),
	},
	// The engine package's two settings, as in Hedge School's vite.config.ts (design 29, "Consequences", and design 33,
	// "The engine's files"). ONNX Runtime Web (the GPU worker, which the shared engine session can start) in its form
	// that takes its WebAssembly from the page: its usual form makes the build copy that file (25.5 MiB) into the site,
	// over Cloudflare Pages' 25 MiB for a file. fetch-engine.mjs stores it beside the engine for a lock with a GPU
	// module, which Blueprints' lock has once its GPU build comes.
	resolve: { conditions: ['onnxruntime-web-use-extern-wasm', ...defaultClientConditions] },
	// The workers as modules: the GPU worker imports the engine's GPU library by URL.
	worker: { format: 'es' },
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
