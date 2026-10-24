// The live site's address (design 23): the canonical address of every page, wherever the page is served. Each site has
// its own. The site's frame sets it (SiteFrame.svelte's `origin`), and its pages' metadata reads it (PageMeta.svelte).
import { createContext } from "svelte";

/** `siteOrigin()` gives what the frame set with `setSiteOrigin(() => origin)`, during a component's start: a function
 *  that gives the address, as Svelte passes a component's property on. */
export const [siteOrigin, setSiteOrigin] = createContext<() => string>();
