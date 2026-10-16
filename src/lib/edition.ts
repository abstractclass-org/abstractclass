// The site's edition (design 11): the full site, for development, or the early access, which shows the review only.
// The build sets it: VITE_EDITION=early. The version is the commit the site was built from (vite.config.ts).
export const EARLY_ACCESS = import.meta.env.VITE_EDITION === "early";
export const SITE_NAME = "Hedge School";
/** The live site's address: the canonical address of every page, wherever the page is served (design 23). */
export const SITE_ORIGIN = "https://hedgeschool.abstractclass.org";
/** The site's own copyright: its code, text and design. The works of others that it ships are on the notices page. */
export const SITE_COPYRIGHT = "© 2026 Yshan";
/** The players' Discord: webgoatguy's, the game's designer. */
export const DISCORD = "https://discord.gg/DxfvEgmQD";
/** The site's Ko-fi page, for tips (design 22): its tip panel opens in the site's own dialog (SupportDialog). */
export const KOFI = "https://ko-fi.com/yshandev";
export const SITE_VERSION: string = __SITE_VERSION__;
/** The engine files that the build ships (vite.config.ts): its CPU module and networks, by SHA-256. */
export const ENGINE_FILES: string = __ENGINE_FILES__;
/** Whether this build stores practice games (design 25): VITE_STORE_PRACTICE_GAMES=on in the production and preview
 *  deployments, each with a database of its own. A build on a developer's machine sends nothing. */
export const STORES_PRACTICE_GAMES = import.meta.env.VITE_STORE_PRACTICE_GAMES === "on";
