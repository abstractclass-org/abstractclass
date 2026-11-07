// The gate on Edge, for every script that can start a browser (the measuring scripts in scripts/measure, favicon.mjs,
// playwright.config.ts): Edge starts only when the environment has HS_EDGE=1, and only the owner sets it. Edge signs a
// new profile in to the Windows account and syncs that account's extensions, so a run that nobody asked for must not
// start it (decisions/product.md, "The measuring scripts start Edge only when asked"). Edge's program comes only from
// here, through the gate. The same file holds the check on a launch's WebGPU flags (`checkLaunch`): the launch helpers
// of scripts/measure/speed.mjs and each script that gives WebGPU flags call it. Its tests: edge.test.mjs.

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

/** The check on a launch's options: Playwright's `launch` options, or the `channel` and `args` of a browser that a
 *  script starts itself. The `channel` goes through the gate on Edge. A launch with a WebGPU flag needs the channel
 *  "chromium", Playwright's full Chromium (docs/working-notes.md, "The GPU in Playwright's Chromium"), also where
 *  Playwright would not pick the headless shell (`headless: false`, an `executablePath`). Throws for a launch that
 *  breaks either rule. `reproducesFault` turns the WebGPU rule off for the launches that show the shell's fault on
 *  purpose: the control runs of scripts/cyanotype-gpu-diagnose.mjs, which are GPU-path runs (both coordinators' yes,
 *  `scripts/machine run --gpu`). No other script sets it, and edge.test.mjs checks that. */
export function checkLaunch({ channel, args } = {}, env = process.env, { reproducesFault = false } = {}) {
  if (channel) checkBrowser(channel, env);
  if (hasWebGpuFlag(args) && channel !== "chromium" && !reproducesFault) {
    throw new Error(`a launch with a WebGPU flag needs channel "chromium", Playwright's full Chromium (got ` +
      `${channel ? `"${channel}"` : "none"}). A headless launch with no channel runs Playwright's ` +
      "chrome-headless-shell, which refuses every WebGPU device on this machine (dxil.dll Windows Error: 87). " +
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
