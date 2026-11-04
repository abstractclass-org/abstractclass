// The layout test (tests/layout.spec.ts) with Playwright Test, in Chromium, against a running site: the local preview
// by default (`npm run build`, then the preview on port 4173, which is the owner's), or the address in BASE_URL. A
// worker sets BASE_URL to its own preview. The browsers show their scroll bars: headless Chromium hides them by default
// (--hide-scrollbars), and a sweep without them misses the room that they take (decisions/product.md, "The review's
// move list under its scroll bar"). The project edge (Edge) comes only when the environment has HS_EDGE=1
// (scripts/edge.mjs, the gate of every script that can start Edge, says why). On Windows, Chromium runs off the GPU
// (docs/working-notes.md, "The GPU in Playwright's Chromium"): with these switches, no process of the browser opens a
// GPU adapter, and the engines' training keeps the GPU. No test needs WebGPU. The Linux runs of the Tests workflow keep
// Chromium's defaults.
import { defineConfig } from "@playwright/test";
import { withEdge } from "./scripts/edge.mjs";

// In CI, Cyanotype's preview must be running: the Tests workflow serves it on port 4174 and sets CYANOTYPE_BASE_URL.
// Without the address, each Cyanotype case skips (the layout test of the monospaced font, Cyanotype's Practice,
// import and notes cases, the Notices test, the cyanotype-*.spec.ts files), and a run that tests no Cyanotype page
// would still pass. Here the config stops the run, whichever tests it selects. Outside CI the cases still skip.
if (process.env.CI && !process.env.CYANOTYPE_BASE_URL) {
  throw new Error("CI needs CYANOTYPE_BASE_URL, the address of Cyanotype's preview (the Tests workflow sets " +
    "http://127.0.0.1:4174). Without it the Cyanotype tests skip and a run passes with no Cyanotype page tested.");
}

const showScrollBars = { ignoreDefaultArgs: ["--hide-scrollbars"] };
const OFF_THE_GPU = process.platform === "win32"
  ? ["--disable-gpu", "--disable-d3d11", "--disable-gpu-process-for-dx12-info-collection", "--disable-software-rasterizer"]
  : [];

export default defineConfig({
  testDir: "tests",
  timeout: 10 * 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://127.0.0.1:4173", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium", launchOptions: { ...showScrollBars, args: OFF_THE_GPU } } },
    ...(withEdge()
      ? [{ name: "edge", use: { browserName: "chromium" as const, channel: "msedge", launchOptions: showScrollBars } }]
      : []),
  ],
});
