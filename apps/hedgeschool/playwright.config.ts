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

// Each Cyanotype test skips on its own when CYANOTYPE_BASE_URL is empty. In CI, this file stops every run without the
// address, whichever tests it selects. So one check covers every spec file, and a new spec file needs no check of its
// own. Outside CI, the Cyanotype tests still skip (docs/hosting.md, "Deploy, check and roll back").
if (process.env.CI && !process.env.CYANOTYPE_BASE_URL) {
  throw new Error("CYANOTYPE_BASE_URL is empty. In CI, set it to the address of Cyanotype's preview " +
    "(.github/workflows/tests.yml sets it). Without it, every Cyanotype test skips, and the run passes but tests no " +
    "Cyanotype page.");
}

const showScrollBars = { ignoreDefaultArgs: ["--hide-scrollbars"] };
// No test reaches PostHog: the browser resolves none of its addresses, so a build with a PostHog key (check:all gives
// Hedge School's a made-up one) sends nothing out. Playwright's routes still answer them, before the browser resolves
// the address (tests/analytics.spec.ts).
const NO_POSTHOG = ["--host-resolver-rules=MAP posthog.com ~NOTFOUND, MAP *.posthog.com ~NOTFOUND"];
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
    { name: "chromium", use: { browserName: "chromium", launchOptions: { ...showScrollBars, args: [...OFF_THE_GPU, ...NO_POSTHOG] } } },
    ...(withEdge()
      ? [{ name: "edge", use: { browserName: "chromium" as const, channel: "msedge", launchOptions: { ...showScrollBars, args: NO_POSTHOG } } }]
      : []),
  ],
});
