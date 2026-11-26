// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/** The commit the site was built from (vite.config.ts). */
	const __SITE_VERSION__: string;
	/** The site's address: the live site, a preview, or the local preview server (vite.config.ts). */
	const __SITE_ORIGIN__: string;
	/** The userscript's version for Tampermonkey: the build's time (vite.config.ts). */
	const __USERSCRIPT_VERSION__: string;
	/** The userscript's code's version: a hash of the files it is made from (vite.config.ts). */
	const __USERSCRIPT_CODE__: string;
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
