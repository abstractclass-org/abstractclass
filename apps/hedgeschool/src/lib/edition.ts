// The site's edition (design 11): the full site, for development, or the early access, which shows the review only.
// The build sets it: VITE_EDITION=early, read in @abstractclass/site/edition.ts, which Cyanotype reads too. The version
// is the commit the site was built from (vite.config.ts).
import { EARLY_ACCESS, STORES_PRACTICE_GAMES } from "@abstractclass/site/edition.ts";
export { EARLY_ACCESS };
/** Openings, the opening book's own page (design 32), with its header tab and its entry points: in the early edition,
 *  and only in a build that a server with the test book serves (vite.config.ts, VITE_TEST_BOOK). The deploy's builds
 *  leave it out, so the live site has no Openings until the engine's book comes (beads abscls-tpaj.13). */
export const OPENINGS = EARLY_ACCESS && import.meta.env.VITE_TEST_BOOK === "1";
export const SITE_NAME = "Hedge School";
/** The live site's address: the canonical address of every page, wherever the page is served (design 23). */
export const SITE_ORIGIN = "https://hedgeschool.abstractclass.org";
/** The site's own copyright: its code, text and design. The works of others that it ships are on the notices page. */
export const SITE_COPYRIGHT = "© 2026 Yshan";
/** The players' Discord: webgoatguy's, the game's designer. Cyanotype's page for developers names it too, so its
 *  address is in @abstractclass/site/community.ts. */
export { DISCORD } from "@abstractclass/site/community.ts";
export const SITE_VERSION: string = __SITE_VERSION__;
/** The engine files that the build ships (vite.config.ts): its CPU module and networks, by SHA-256. */
export const ENGINE_FILES: string = __ENGINE_FILES__;
/** Whether this build stores practice games (design 25): @abstractclass/site/edition.ts reads the build's
 *  VITE_STORE_PRACTICE_GAMES. */
export { STORES_PRACTICE_GAMES };
