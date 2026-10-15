// The practice games' consent across tabs (design 25): a Decline in one tab reaches a practice game open in another,
// with no reload. On a build that stores practice games (VITE_STORE_PRACTICE_GAMES=on, as CI builds), with
// /api/practice-games answered here. A build that stores none skips it. That a game sent before a delete is not kept
// after it is the Function's check, in src/lib/practice/stored.test.ts.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const NUMBER = "c9d8e7f6-a5b4-4c3d-8e2f-1a0b9c8d7e6f";

test("a Decline in another tab: the practice tab's game goes with no number, and its page shows the Decline", async ({ context }) => {
  const sent: { browser: string | null }[] = [];
  await context.route("**/api/practice-games", async r => {
    if (r.request().method() === "POST") sent.push(JSON.parse(r.request().postData()!));
    await r.fulfill({ status: 201, contentType: "application/json", body: "{}" });
  });
  const practice = await context.newPage();
  await practice.goto("/privacy");
  test.skip(!(await practice.getByRole("heading", { name: "Your games against HedgeFund" }).count()), "this build stores no practice games");

  // A game in progress, the player to move (as the layout sweep's), with the visitor's consent to the link.
  const moves = (JSON.parse(readFileSync("tests/fixtures/hedgefund-review.json", "utf8")).record as string)
    .replace(/\[[^\]]*\]/g, "").split(/\s+/).filter(t => /^[A-T]\d+-[A-T]\d+$/.test(t)).slice(0, 20);
  await practice.evaluate(([number, kept]) => {
    localStorage.clear();
    localStorage.setItem("hedge-school:consent:2", JSON.stringify({ analytics: null, games: "granted" }));
    localStorage.setItem("hedge-school:browser-number:1", number as string);
    localStorage.setItem("hedge-school:practice-game:1", JSON.stringify(kept));
  }, [NUMBER, { version: 1, bot: { network: "b10c128-s66625408-d13350730", visits: 64, variety: "low" }, human: 0,
                name: "", seed: 1, moves, builds: [], started: new Date().toISOString() }] as const);
  await practice.goto("/practice");
  const abort = practice.getByRole("button", { name: "Abort" });
  await expect(abort).toBeEnabled({ timeout: 120_000 });

  // The Decline, in another tab.
  const privacy = await context.newPage();
  await privacy.goto("/privacy");
  const link = privacy.getByRole("switch", { name: /Group my games/ });
  await expect(link).toBeChecked();
  await link.click();
  await expect(link).not.toBeChecked();

  // The practice tab ends its game: it goes with no number.
  await practice.bringToFront();
  await abort.click();
  await practice.getByRole("alertdialog").getByRole("button", { name: "Abort" }).click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0].browser).toBeNull();

  // The practice tab's own privacy page, by a link that the site's router follows (no reload), shows the Decline.
  await practice.evaluate(() => document.body.append(Object.assign(document.createElement("a"), { href: "/privacy", id: "to-privacy", textContent: "Privacy" })));
  await practice.locator("#to-privacy").click({ timeout: 10_000 });
  await practice.waitForURL("**/privacy", { timeout: 10_000 });
  expect(await practice.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
  await expect(practice.getByRole("switch", { name: /Group my games/ })).not.toBeChecked();
});
