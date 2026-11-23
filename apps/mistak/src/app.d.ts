// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	/** The commit the site was built from (vite.config.ts). */
	const __SITE_VERSION__: string;
	/** The site's address: the live site, a preview, or the local preview server (vite.config.ts). */
	const __SITE_ORIGIN__: string;
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
