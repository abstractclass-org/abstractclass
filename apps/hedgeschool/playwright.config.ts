// The layout sweep (tests/layout.spec.ts) with Playwright Test, in Chromium and in Edge, against a running site: the
// local preview by default (`npm run build`, then the preview on port 4173), or the address in BASE_URL (a Cloudflare
// preview). The browsers show their scroll bars: headless Chromium hides them by default (--hide-scrollbars), and a
// sweep without them misses the room that they take (decisions/product.md, "The review's move list under its scroll
// bar").
import { defineConfig } from "@playwright/test";

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
    { name: "edge", use: { browserName: "chromium", channel: "msedge", launchOptions: showScrollBars } },
  ],
});
