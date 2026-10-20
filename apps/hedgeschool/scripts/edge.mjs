// The gate on Edge, for every script that can start a browser (the measuring scripts in scripts/measure, favicon.mjs,
// playwright.config.ts): Edge starts only when the environment has HS_EDGE=1, and only the owner sets it. Edge signs a
// new profile in to the Windows account and syncs that account's extensions, so a run that nobody asked for must not
// start it (decisions/product.md, "The measuring scripts start Edge only when asked"). Its tests: edge.test.mjs.

/** The browsers that the scripts start: Playwright's Chromium, and Edge (Playwright's channel "msedge"). */
const BROWSERS = ["chromium", "msedge"];

/** Whether the environment `env` asks for Edge. */
export const withEdge = (env = process.env) => env.HS_EDGE === "1";

/** The browser `channel`, once the gate allows it: Edge only with HS_EDGE=1. Throws for any other browser. */
export function checkBrowser(channel, env = process.env) {
  if (!BROWSERS.includes(channel)) throw new Error(`unknown browser "${channel}": use ${BROWSERS.join(" or ")}`);
  if (channel === "msedge" && !withEdge(env)) {
    throw new Error("Edge starts only when the environment has HS_EDGE=1, and only the owner sets it. Use chromium.");
  }
  return channel;
}

/** A script's browser list, from its argument `list` (names with commas between them): Chromium alone by default.
 *  Each name goes through the gate. */
export const browserList = (list, env = process.env) => (list || "chromium").split(",").map(c => checkBrowser(c, env));
