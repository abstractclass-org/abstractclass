// The gate on Edge, for every script that can start a browser (the measuring scripts in scripts/measure, favicon.mjs,
// playwright.config.ts): Edge starts only when the environment has HS_EDGE=1, and only the owner sets it. Edge signs a
// new profile in to the Windows account and syncs that account's extensions, so a run that nobody asked for must not
// start it (decisions/product.md, "The measuring scripts start Edge only when asked"). Edge's program comes only from
// here, through the gate. The same file holds the check on WebGPU flags (`checkLaunch`): every launch that can carry
// them goes through it. Its tests: edge.test.mjs.

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

/** Whether the launch arguments `args` turn WebGPU on: `--enable-unsafe-webgpu`, or `--enable-features` with WebGPU. */
export const hasWebGpuFlag = (args = []) =>
  args.some(a => a === "--enable-unsafe-webgpu" || /^--enable-features=.*webgpu/i.test(a));

/** The check on a launch, for every script that starts a browser with options of Playwright's `launch` (a script that
 *  starts the browser itself gives the same `channel` and `args`). The `channel` goes through the gate on Edge. A launch
 *  with a WebGPU flag needs the channel "chromium", Playwright's full Chromium: its chrome-headless-shell refuses every
 *  WebGPU device on this machine ("DynamicLib.Open: dxil.dll Windows Error: 87"), and a run on it measures nothing
 *  (docs/working-notes.md, "Faults with the WebGPU flags"). Throws for a launch that breaks either rule.
 *  `reproducesFault` turns the second rule off, for a launch whose purpose is to show that fault: the control runs of
 *  scripts/cyanotype-gpu-diagnose.mjs. No other script sets it. */
export function checkLaunch({ channel, args } = {}, env = process.env, { reproducesFault = false } = {}) {
  if (channel) checkBrowser(channel, env);
  if (hasWebGpuFlag(args) && channel !== "chromium" && !reproducesFault) {
    throw new Error(`a launch with a WebGPU flag needs channel "chromium" (got ${channel ? `"${channel}"` : "none"}): ` +
      "Playwright's chrome-headless-shell refuses the GPU on this machine (dxil.dll Windows Error: 87). " +
      'See docs/working-notes.md, "Faults with the WebGPU flags".');
  }
}

/** A script's browser list, from its argument `list` (names with commas between them): Chromium alone by default.
 *  Each name goes through the gate. */
export const browserList = (list, env = process.env) => (list || "chromium").split(",").map(c => checkBrowser(c, env));

/** Edge's program, once the gate allows it: the environment's EDGE, or Edge's usual place on Windows, which
 *  Playwright's channel "msedge" also starts. */
export function edgeProgram(env = process.env) {
  checkBrowser("msedge", env);
  return env.EDGE ?? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
}
