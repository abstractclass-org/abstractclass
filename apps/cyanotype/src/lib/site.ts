// The site's name and version (docs/design/33-cyanotype.md). The version is the commit the site was built from
// (vite.config.ts).
export const SITE_NAME = "Cyanotype";
/** The engine's name, as the site shows it: its practice bot and the engine that reviews games. */
export const ENGINE_NAME = "Stamp Duty";
export const SITE_VERSION: string = typeof __SITE_VERSION__ === "string" ? __SITE_VERSION__ : "unknown";
/** The live site's address: the canonical address of every page, wherever the page is served (design 23). */
export const SITE_ORIGIN = "https://cyanotype.abstractclass.org";
/** The site's own copyright: its code, text and design. The works of others that it ships are on the notices page. */
export const SITE_COPYRIGHT = "© 2026 Yshan";
/** The key under which this browser keeps the visitor's theme. Also in src/app.html, which reads it before the page
 *  draws. */
export const THEME_KEY = "cyanotype:theme:1";
/** The key under which this tab keeps each page's scroll place (SiteFrame). */
export const PLACES_KEY = "cyanotype:scroll-places:1";
/** The keys under which this browser keeps the review's display settings, the engine's settings, the place and size
 *  of the hands' panel (the same on every page with the board), the id of the game in review (the game is in the
 *  browser's store of games), and the Analysis board's position on screen. */
export const DISPLAY_KEY = "cyanotype:review-display:1";
export const ENGINE_KEY = "cyanotype:engine:1";
export const PANEL_KEY = "cyanotype:panel:1";
export const REVIEW_GAME_KEY = "cyanotype:review-game:2";
export const BOARD_AT_KEY = "cyanotype:board-at:1";
