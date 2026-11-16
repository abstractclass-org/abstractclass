// The Discord on both sites' pages for developers (Hedge School's design 18, and Cyanotype's design 33, "Partner
// sites", item 9): the partners' test asks there for the test address, and the partner list says to ask there to join
// it. Both games have the same designer and the same community, so both pages link the one address that
// @abstractclass/site/community.ts holds. Run: npx playwright test tests/developers-discord.spec.ts, with
// CYANOTYPE_BASE_URL for Cyanotype's cases.
import { expect, test } from "./page-log.ts";
import { DISCORD } from "../../../packages/site/src/community.ts";
import { CYANOTYPE } from "./cyanotype-review.ts";

for (const site of ["Hedge School", "Cyanotype"]) {
  test(`${site}'s page for developers asks in the Discord for the test address and to join the partner list`,
    async ({ page, baseURL }) => {
      const origin = site === "Cyanotype" ? CYANOTYPE : baseURL;
      test.skip(!origin, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
      await page.goto(new URL("/developers", origin).href);
      await expect(page).toHaveTitle(/For developers/);
      const main = page.locator("main");
      // The partners' test: the link is where a developer asks for the test address.
      const testing = main.locator("h2#test + p");
      await expect(testing).toContainText(/ask in the Discord for a test address/);
      await expect(testing.getByRole("link", { name: "ask in the Discord" })).toHaveAttribute("href", DISCORD);
      // The partner list: the link is where a developer asks to join it.
      const list = main.locator("p", { hasText: `${site} lists its partner sites:` });
      await expect(list).toContainText(/ask in the Discord to join the list/);
      await expect(list.getByRole("link", { name: "ask in the Discord" })).toHaveAttribute("href", DISCORD);
      // The page's only links to a Discord are these two, and neither names another address.
      const discords = await main.locator("a[href*='discord']")
        .evaluateAll(links => links.map(a => a.getAttribute("href")));
      expect(discords).toEqual([DISCORD, DISCORD]);
    });
}

// Cyanotype's About and Privacy name the Discord in Hedge School's words, with the same address (abscls-8tl1.108):
// About in the paragraph on the game's designer and in Early access, Privacy under Questions.
test("Cyanotype's About names the players' Discord, and asks there what works", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/about", CYANOTYPE).href);
  await expect(page).toHaveTitle(/About/);
  const main = page.locator("main");
  const designer = main.locator("p", { hasText: "Blueprints' designer is webgoatguy." });
  await expect(designer).toContainText("Its players meet in webgoatguy's Discord.");
  await expect(designer.getByRole("link", { name: "webgoatguy's Discord" })).toHaveAttribute("href", DISCORD);
  const early = main.locator("h2#early-access ~ p", { hasText: "Tell us what works" });
  await expect(early).toContainText("Tell us what works and what does not in the Discord.");
  await expect(early.getByRole("link", { name: "the Discord" })).toHaveAttribute("href", DISCORD);
  // The page's only links to a Discord are these two.
  const discords = await main.locator("a[href*='discord']")
    .evaluateAll(links => links.map(a => a.getAttribute("href")));
  expect(discords).toEqual([DISCORD, DISCORD]);
});

test("Cyanotype's Privacy sends questions to the players' Discord", async ({ page }) => {
  test.skip(!CYANOTYPE, "CYANOTYPE_BASE_URL gives no Cyanotype preview");
  await page.goto(new URL("/privacy", CYANOTYPE).href);
  await expect(page).toHaveTitle(/Privacy/);
  const ask = page.locator("main h2:text-is('Questions') + p");
  await expect(ask).toHaveText("Ask in the players' Discord.");
  await expect(ask.getByRole("link", { name: "the players' Discord" })).toHaveAttribute("href", DISCORD);
});
