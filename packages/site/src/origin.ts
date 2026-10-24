// The live site's address (design 23): the canonical address of every page, wherever the page is served. Each site has
// its own. Its root layout sets it, and its pages' metadata reads it (PageMeta.svelte).
import { createContext } from "svelte";

/** `siteOrigin()` gives the address that the layout set with `setSiteOrigin(origin)`, during a component's start. */
export const [siteOrigin, setSiteOrigin] = createContext<string>();
