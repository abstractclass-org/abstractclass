// The site's name and version (docs/design/34-tak-site.md, "Decision", item 2). The version is the commit the site
// was built from (vite.config.ts).
export const SITE_NAME = "Mistak";
/** The engine's name, as the site shows it: its practice bot and the engine that reviews games. */
export const ENGINE_NAME = "Takumi";
export const SITE_VERSION: string = typeof __SITE_VERSION__ === "string" ? __SITE_VERSION__ : "unknown";
/** The live site's address: the canonical address of every page, wherever the page is served (design 23). */
export const SITE_ORIGIN = "https://mistak.abstractclass.org";
/** The site's own copyright: its code, text and design, as every site has it. The works of others that it ships are
 *  on the notices page. */
export { SITE_COPYRIGHT } from "@abstractclass/site/copyright.ts";
/** The key under which this browser keeps the visitor's theme. Also in src/app.html, which reads it before the page
 *  draws. */
export const THEME_KEY = "mistak:theme:1";
/** The key under which this tab keeps each page's scroll place (SiteFrame). */
export const PLACES_KEY = "mistak:scroll-places:1";
