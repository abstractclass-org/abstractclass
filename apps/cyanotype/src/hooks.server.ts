// What the build does to each page's HTML (SvelteKit's `handle` hook: the site is static, so it runs only in the
// build, and in the development server). Each page gets the notice for scripts that do not load in its head
// (@abstractclass/site's loadNotice.ts), in the place that src/app.html marks.
import type { Handle } from "@sveltejs/kit/hooks";
import { withLoadNotice } from "@abstractclass/site/loadNotice.ts";

export const handle: Handle = ({ event, resolve }) => resolve(event, { transformPageChunk: withLoadNotice });
