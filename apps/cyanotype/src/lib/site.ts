// The site's name and version (docs/design/33-cyanotype.md). The version is the commit the site was built from
// (vite.config.ts).
export const SITE_NAME = "Cyanotype";
/** The engine's name, as the site shows it: its practice bot and the engine that reviews games. */
export const ENGINE_NAME = "Stamp Duty";
export const SITE_VERSION: string = typeof __SITE_VERSION__ === "string" ? __SITE_VERSION__ : "unknown";
/** The engine files that the build ships (vite.config.ts): its CPU module and networks, by SHA-256. A release that
 *  changes one makes the removal of earlier results due (game/earlierResults.ts). */
export const ENGINE_FILES: string = typeof __ENGINE_FILES__ === "string" ? __ENGINE_FILES__ : "";
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
 *  of the hands' panel (the same on every page with the board), the id of the last game reviewed (the Review tab's
 *  "Continue your last review": the game is in the browser's store of games, game/store.ts), and the Analysis board's
 *  position on screen. */
export const DISPLAY_KEY = "cyanotype:review-display:1";
// Version 2: the GPU's setting is the visitor's. Version 1 kept Off, which the site set while its engine ran on the CPU
// only, so that a kept Off was not the visitor's choice.
export const ENGINE_KEY = "cyanotype:engine:2";
export const PANEL_KEY = "cyanotype:panel:1";
export const LAST_REVIEW_KEY = "cyanotype:review-game:2";
export const BOARD_AT_KEY = "cyanotype:board-at:1";
/** The key under which this browser keeps the board editor's position being made, in the notation. */
export const EDITOR_KEY = "cyanotype:editor:1";
/** The key under which this browser keeps Practice's points bar settings, with the values of Hedge School's
 *  (@abstractclass/practice's `scoreStore`). */
export const PRACTICE_DISPLAY_KEY = "cyanotype:practice-display:1";
