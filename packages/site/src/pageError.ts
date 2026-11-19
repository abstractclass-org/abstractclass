// The error page of each site (abscls-w131): the page that SvelteKit shows in the place of a page that failed, in the
// site's frame (each site's src/routes/+error.svelte, which shows ErrorPage.svelte). A link to a page whose code does
// not load is the case that the load notice (loadNotice.ts) cannot see: SvelteKit catches the failure of the page's
// node and shows its error page, and the notice cannot tell that failure from a preload on hover of a page that works.
// The error page tells the player what to do, in the load notice's words and with its button. Each other error gets
// one line, in strict Simplified Technical English, and never the code's message (the rule of the Practice page's
// lines, Hedge School's design 24, item 14). The code's message goes only into the error report: each site's
// src/hooks.client.ts gives SvelteKit's `handleError` (pageErrors), which sends the error to the report and tells the
// page which error it is.

import type { HandleClientError } from "@sveltejs/kit/hooks";
import { LOAD_NOTICE } from "./loadNotice.ts";

declare global {
  namespace App {
    interface Error {
      /** The error is a module of the page's code that did not load (pageErrors). */
      notLoaded?: boolean;
    }
  }
}

/** The browsers' words for a module that did not load: Chrome's "Failed to fetch dynamically imported module",
 *  Firefox's "error loading dynamically imported module" and Safari's "Importing a module script failed." (loadNotice.ts),
 *  and Vite's "Unable to preload CSS" for a page's style. */
const NOT_LOADED = /dynamically imported module|Importing a module script failed|Unable to preload CSS/;

/** Whether an error is a module of the page's code that did not load. */
export function notLoaded(error: unknown): boolean {
  return error instanceof Error && NOT_LOADED.test(error.message);
}

/** What the error page shows (strict Simplified Technical English: the player follows it): its title in the browser's
 *  tab, its line, and the way out. */
export interface ErrorLine {
  title: string;
  text: string;
  /** "reload": the button that loads the page again (LOAD_NOTICE's). "home": a link to the home page. */
  action: "reload" | "home";
}

export const NOT_FOUND_LINE: ErrorLine = { title: "Page not found", text: "There is no page at this address.",
                                           action: "home" };
export const NOT_LOADED_LINE: ErrorLine = { title: "Page did not load", text: LOAD_NOTICE.text, action: "reload" };
export const STOPPED_LINE: ErrorLine = { title: "Page error", text: "An error stopped this page.", action: "reload" };

/** The words of the link to the home page. */
export const HOME_ACTION = "Go to the home page";

/** The error page's line for the error that SvelteKit gives the page (`page.status` and `page.error`). */
export function errorLine(status: number, error: App.Error | null): ErrorLine {
  if (error?.notLoaded) return NOT_LOADED_LINE;
  return status === 404 ? NOT_FOUND_LINE : STOPPED_LINE;
}

/** SvelteKit's `handleError` for each site's src/hooks.client.ts: SvelteKit calls it for each error that it caught,
 *  and shows the error page with what it gives. An error that the code threw (SvelteKit's kind "unknown") goes to the
 *  error report (`report`), and the page learns whether it is a module that did not load. SvelteKit's own errors (an
 *  address that the site does not have) and the errors of SvelteKit's `error` helper are no fault of the code: they go
 *  to no report, and keep SvelteKit's status and message. */
export function pageErrors(report: (error: unknown) => void): HandleClientError {
  return ({ kind, error }) => {
    if (kind !== "unknown") return;
    report(error);
    return { notLoaded: notLoaded(error) };
  };
}
