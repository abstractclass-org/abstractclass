// The site's name and version (docs/design/33-drawing-board.md). The version is the commit the site was built from
// (vite.config.ts).
export const SITE_NAME = "Drawing Board";
/** The engine's name, as the site shows it: its practice bot and the engine that reviews games. */
export const ENGINE_NAME = "Stamp Duty";
export const SITE_VERSION: string = typeof __SITE_VERSION__ === "string" ? __SITE_VERSION__ : "unknown";
/** The live site's address: the canonical address of every page, wherever the page is served (design 23). */
export const SITE_ORIGIN = "https://drawingboard.abstractclass.org";
/** The site's own copyright: its code, text and design. The works of others that it ships are on the notices page. */
export const SITE_COPYRIGHT = "© 2026 Yshan";
/** The key under which this browser keeps the visitor's theme. Also in src/app.html, which reads it before the page
 *  draws. */
export const THEME_KEY = "drawing-board:theme:1";
/** The key under which this tab keeps each page's scroll place (SiteFrame). */
export const PLACES_KEY = "drawing-board:scroll-places:1";
