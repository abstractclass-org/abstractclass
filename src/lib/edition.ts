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
export const SITE_VERSION: string = __SITE_VERSION__;
