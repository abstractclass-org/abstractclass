// A game that keeps its own settings (design 09): the panel shows its depth per move as the player chose it, so Custom
// at a preset's visits keeps its row, and a game from a review file stores each change. The layout sweep's game
// (tests/fixtures/hedgefund-review.json, HedgeFund 0.1 Lite at 512 visits) as it loads, then the same game without its
// settings: its review's mark names 0.1 Lite, and it stores none. The engine is off, so nothing searches.
import { test, expect, type Page } from "@playwright/test";

const FIXTURE = "tests/fixtures/hedgefund-review.json", EARLIER = "b10c128-s66625408-d13350730";

/** The stored game's settings (game/store.ts), as the browser's store holds them. */
const stored = (page: Page, id: string) => page.evaluate(id => new Promise(resolve => {
  const open = indexedDB.open("learn-enclosure");
  open.onsuccess = () => {
    const get = open.result.transaction("games").objectStore("games").get(id);
    get.onsuccess = () => { open.result.close(); resolve(get.result?.settings); };
  };
}), id);

/** Removes the stored game's settings: its review's mark then gives them. */
const removeSettings = (page: Page, id: string) => page.evaluate(id => new Promise<void>(resolve => {
  const open = indexedDB.open("learn-enclosure");
  open.onsuccess = () => {
    const games = open.result.transaction("games", "readwrite").objectStore("games"), get = games.get(id);
    get.onsuccess = () => {
      const game = get.result;
      delete game.settings;
      games.put(game, id).onsuccess = () => { open.result.close(); resolve(); };
    };
  };
}), id);

/** Opens the review's engine settings. */
async function settings(page: Page) {
  const button = page.getByRole("button", { name: "Engine settings" }), panel = page.getByRole("region", { name: "Engine settings" });
  await button.waitFor();
  if (!(await panel.isVisible())) await button.click();
  return panel;
}

test("Custom at a preset's visits keeps its row, and a game from a review file stores each change", async ({ page }) => {
  await page.goto("/review");
  await page.evaluate(() => localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false })));
  await page.locator('input[type="file"][accept*="json"]').first().setInputFiles(FIXTURE);
  await page.waitForURL(/#game=/);
  const id = new URL(page.url()).hash.match(/game=([^&]+)/)![1];
  // The Review tab reloads itself to open the game (Arrival.svelte), and the address names the game before that load
  // starts. The review's controls show only after that reload, so wait for them: a goto here can meet the reload.
  await page.getByRole("button", { name: "Engine settings" }).waitFor();

  for (const kind of ["stored", "mark"]) {
    const panel = await settings(page);
    const depth = panel.getByRole("radiogroup", { name: "Depth per move" });
    const box = panel.getByRole("spinbutton", { name: "Custom", exact: true });
    await expect(depth.getByRole("radio", { name: "Lite" })).toHaveAttribute("aria-checked", "true");
    await depth.getByRole("radio", { name: "Custom" }).click();
    for (const visits of [512, 1024, 768]) {
      if (visits !== 512) { await box.fill(String(visits)); await box.press("Tab"); }
      await expect(depth.getByRole("radio", { name: "Custom" }), `${kind}, ${visits}`).toHaveAttribute("aria-checked", "true");
      await expect(box, `${kind}, ${visits}`).toHaveValue(String(visits));
      if (kind === "stored") await expect.poll(() => stored(page, id), `${kind}, ${visits}`).toEqual({ network: EARLIER, visits });
    }
    if (kind === "mark") expect(await stored(page, id)).toBeUndefined();
    else { await removeSettings(page, id); await page.reload(); }
  }
});
