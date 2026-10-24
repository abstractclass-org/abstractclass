// The site's name and version (docs/design/33-drawing-board.md). The version is the commit the site was built from
// (vite.config.ts).
export const SITE_NAME = "Drawing Board";
/** The engine's name, as the site shows it: its practice bot and the engine that reviews games. */
export const ENGINE_NAME = "Stamp Duty";
export const SITE_VERSION: string = typeof __SITE_VERSION__ === "string" ? __SITE_VERSION__ : "unknown";
