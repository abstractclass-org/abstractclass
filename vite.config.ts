import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// SNAPSHOT=1 builds each page as one self-contained HTML file (scripts, styles and data inlined) into
// build-snapshot/, for sharing a page where the site is not hosted. The normal build splits the files.
const snapshot = process.env.SNAPSHOT === '1';

export default defineConfig({
	build: snapshot ? { assetsInlineLimit: Infinity } : {},
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter(snapshot ? { pages: 'build-snapshot', assets: 'build-snapshot' } : {}),
			output: snapshot ? { bundleStrategy: 'inline' } : {}
		})
	]
});
