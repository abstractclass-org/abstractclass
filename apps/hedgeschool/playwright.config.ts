// The layout sweep (tests/layout.spec.ts) with Playwright Test, in Chromium, against a running site: the local preview
// by default (`npm run build`, then the preview on port 4173, which is the owner's), or the address in BASE_URL. A
// worker sets BASE_URL to its own preview. The browsers show their scroll bars: headless Chromium hides them by default
// (--hide-scrollbars), and a sweep without them misses the room that they take (decisions/product.md, "The review's
// move list under its scroll bar"). The project edge (Edge) comes only when the environment has HS_EDGE=1
// (scripts/edge.mjs, the gate of every script that can start Edge, says why).
import { defineConfig } from "@playwright/test";
import { withEdge } from "./scripts/edge.mjs";

const showScrollBars = { ignoreDefaultArgs: ["--hide-scrollbars"] };

export default defineConfig({
  testDir: "tests",
  timeout: 10 * 60_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: process.env.BASE_URL ?? "http://127.0.0.1:4173", screenshot: "only-on-failure" },
  projects: [
    { name: "chromium", use: { browserName: "chromium", launchOptions: showScrollBars } },
    ...(withEdge()
      ? [{ name: "edge", use: { browserName: "chromium" as const, channel: "msedge", launchOptions: showScrollBars } }]
      : []),
  ],
});
