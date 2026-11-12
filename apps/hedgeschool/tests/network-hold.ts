// The engine's network while it loads (design 06, item 7): a test holds the network's files, reads the engine header
// while it says that the network loads, then lets the files go. tests/network-loading.spec.ts and the layout test's
// case "layout of /openings" use it.
import type { Page } from "@playwright/test";

/** The engine header's words while the network loads (NETWORK_LOADS in packages/review/src/ReviewView.svelte). */
export const NETWORK_WORDS = "Loading the engine's network…";

/** Holds each request for a network's file (packages/engine/src/client.ts, checked) until `release` runs. A later
 *  hold comes first: the route added last answers first. */
export async function holdNetworks(page: Page) {
  let release!: () => void;
  const released = new Promise<void>(resolve => (release = resolve));
  await page.route(/\/engine\/[^/]+\/model[^/]*$/, async route => { await released; await route.continue(); });
  return release;
}

/** The engine header's line: the engine's switch, the position's search bar, the visits and the gear. It waits for the
 *  page to show the line, which can take long on a busy machine. */
export async function headerLine(page: Page) {
  const bar = page.getByRole("progressbar", { name: "This position's search" });
  await bar.waitFor({ timeout: 60_000 });
  return bar.locator("..");
}
