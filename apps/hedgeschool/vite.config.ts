import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, defineConfig } from 'vite';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

// The site's version: the commit it is built from (Cloudflare's build names it, else Git), for the footer.
const commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA
	?? (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

// The site's address, for what leaves the site and comes back to it: the userscript, which updates from it and opens
// the review there (src/lib/game/userscript.ts). The deploy's build of main (.github/workflows/deploy.yml, which sets
// Cloudflare's build variables) is the live site, a build of another branch its preview, and a local build the local
// preview server. SITE_ORIGIN sets another.
const origin = process.env.SITE_ORIGIN
	?? (process.env.CF_PAGES_BRANCH === 'main' ? 'https://hedgeschool.abstractclass.org'
		: process.env.CF_PAGES_URL ?? 'http://127.0.0.1:4173');

// The partner sites' test (src/lib/game/partners.ts, design 18): the deploy's build of the branch partner_test also
// takes a partner's pages on the developer's own computer (localhost), so that a partner can test before its own site
// is live. The live site and the dev preview never do. For a local build, VITE_PARTNER_TEST=1 sets it. Vite reads the
// VITE_ variables after it loads this file.
if (process.env.CF_PAGES_BRANCH === 'partner_test') process.env.VITE_PARTNER_TEST ??= '1';

// The userscript's versions (src/lib/game/userscript.ts). For Tampermonkey: the build's time (UTC), which grows with
// each build, so that Tampermonkey takes each new build as an update. For the import page: a hash of the files that
// make its code, so that it tells a player of an out-of-date userscript only when that code changed.
const now = new Date(), pad = (n: number) => String(n).padStart(2, '0');
const userscriptVersion = `${now.getUTCFullYear()}.${now.getUTCMonth() + 1}.${now.getUTCDate()}.${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const userscriptCode = createHash('sha256')
	.update(['userscript.ts', 'pageCode.ts', 'meafPage.ts', 'meaf.ts', 'strategyjamPage.ts', 'strategyjam.ts']
		.map(f => readFileSync(`src/lib/game/${f}`, 'utf8')).join('\0'))
	.digest('hex').slice(0, 12);

// The engine files that the stored results name (src/lib/game/earlierResults.ts): the CPU module and the networks, by
// SHA-256. The site's first start after a release that changes one removes the results that no stored game needs.
const engineFiles = (JSON.parse(readFileSync('engine.lock.json', 'utf8')).artifacts as { kind: string; sha256: string }[])
	.filter(a => a.kind === 'module' || a.kind === 'model').map(a => a.sha256).join(' ');

export default defineConfig({
	define: {
		__SITE_VERSION__: JSON.stringify(commit.slice(0, 7)), __SITE_ORIGIN__: JSON.stringify(origin),
		__USERSCRIPT_VERSION__: JSON.stringify(userscriptVersion), __USERSCRIPT_CODE__: JSON.stringify(userscriptCode),
		__ENGINE_FILES__: JSON.stringify(engineFiles),
	},
	// ONNX Runtime Web (the GPU worker, @abstractclass/engine/gpuWorker.ts) in its form that takes its WebAssembly from
	// the page: its usual form makes the build copy that file (26.8 MB) into the site, over Cloudflare Pages' 25 MiB for a
	// file. scripts/fetch-engine.mjs stores it compressed beside the engine instead.
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
