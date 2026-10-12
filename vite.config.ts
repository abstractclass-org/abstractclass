import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defaultClientConditions, defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// The site's version: the commit it is built from (Cloudflare's build names it, else Git), for the footer.
const commit = process.env.CF_PAGES_COMMIT_SHA ?? process.env.WORKERS_CI_COMMIT_SHA
	?? (() => { try { return execSync('git rev-parse HEAD').toString().trim(); } catch { return 'unknown'; } })();

export default defineConfig({
	define: { __SITE_VERSION__: JSON.stringify(commit.slice(0, 7)) },
	// ONNX Runtime Web (the GPU worker, src/lib/engine/gpuWorker.ts) in its form that takes its WebAssembly from the page:
	// its usual form makes the build copy that file (26.8 MB) into the site, over Cloudflare Pages' 25 MiB for a file.
	// scripts/fetch-engine.mjs stores it compressed beside the engine instead.
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
