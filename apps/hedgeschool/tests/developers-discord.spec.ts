// The Discord on both sites' pages for developers (Hedge School's design 18, and Cyanotype's design 33, "Partner
// sites", item 9): the partners' test asks there for the test address, and the partner list says to ask there to join
// it. Both games have the same designer and the same community, so both pages link the one address that
// @abstractclass/site/community.ts holds. Run: npx playwright test tests/developers-discord.spec.ts, with
// CYANOTYPE_BASE_URL for Cyanotype's case.
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
      // Nowhere on the page does a link to a Discord name another address.
      const discords = await main.locator("a[href*='discord']")
        .evaluateAll(links => links.map(a => a.getAttribute("href")));
      expect(discords).toEqual([DISCORD, DISCORD]);
    });
}
