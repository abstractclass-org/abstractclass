// The site's edition (design 11): the full site, for development, or the early access, which shows the review only.
// The build sets it: VITE_EDITION=early. The version is the commit the site was built from (vite.config.ts).
export const EARLY_ACCESS = import.meta.env.VITE_EDITION === "early";
export const SITE_NAME = "Hedge School";
/** The players' Discord: webgoatguy's, the game's designer. */
export const DISCORD = "https://discord.gg/DxfvEgmQD";
export const SITE_VERSION: string = __SITE_VERSION__;
