// The area map's style "After vs before" (design 30, item 2): its signs by good and bad for the player who chose, for
// both sides. On the layout test's game (tests/fixtures/hedgefund-review.json), with the engine off, so that the map's
// values are the review's stored searches. A Blue move and a Red move each show a green plus where the forecast rose
// for the mover and a yellow minus where it fell: the numbers under the pointer say which, and the sign's colour is
// the token's (`--sign-green`, `--sign-yellow` in packages/review/src/review.css). By edge and by turn, in the light
// theme, then the board and the legend of the last position in both themes. Run:
// npx playwright test tests/area-map-signs.spec.ts --project=chromium.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { loadReviewFile } from "./review-file.ts";
import { toMove } from "./move-header.ts";

const FIXTURE = "tests/fixtures/hedgefund-review.json";
/** The tokens' colours, by theme (review.css): Excellent's green and Inaccuracy's yellow, 3:1 against the board. */
const INK = {
  light: { rise: "rgb(79, 136, 48)", fall: "rgb(158, 119, 6)", board: "rgb(243, 234, 215)" },
  dark: { rise: "rgb(111, 170, 82)", fall: "rgb(217, 165, 33)", board: "rgb(58, 54, 46)" },
} as const;
type Theme = keyof typeof INK;

const board = (page: Page) => page.locator("svg[aria-label='Enclosure board']");
const legend = (page: Page) => page.locator(".map-legend");
/** The status line names the edge to play after edge `k`. */
const at = (page: Page, k: number) => expect(page.locator("section.side")).toContainText(`Edge ${k + 1} of `);

/** The board's signs: each one's kind, the colours of its ink and its halo, whether it is a plus, and the middle of its
 *  point on the screen. */
const signsOn = (b: Locator) => b.evaluate((svg: SVGSVGElement) =>
  [...svg.querySelectorAll<SVGRectElement>("rect[fill^='url(#']")].flatMap(r => {
    const id = r.getAttribute("fill")!.slice(5, -1), kind = id.match(/-(rise|fall)$/)?.[1] as "rise" | "fall" | undefined;
    if (!kind) return [];
    const pattern = svg.querySelector(`pattern[id="${id}"]`)!, ink = pattern.querySelector(".ink")!;
    const p = new DOMPoint(Number(r.getAttribute("x")) + 0.5, Number(r.getAttribute("y")) + 0.5).matrixTransform(svg.getScreenCTM()!);
    return [{ kind, ink: getComputedStyle(ink).stroke, halo: getComputedStyle(pattern.querySelector(".halo")!).stroke,
              plus: ink.getAttribute("d")!.includes("V"), x: p.x, y: p.y }];
  }));

/** Every sign: a green plus or a yellow minus, whichever side moved, with a halo in the board's colour. */
function expectInks(signs: Awaited<ReturnType<typeof signsOn>>, theme: Theme, where: string) {
  for (const s of signs) {
    expect(s.ink, `a ${s.kind} ${where}`).toBe(INK[theme][s.kind]);
    expect(s.plus).toBe(s.kind === "rise");
    expect(s.halo).toBe(INK[theme].board);
  }
}

for (const judge of ["edge", "turn"] as const) {
  test(`after vs before by ${judge}: a green plus where the forecast rose for the mover, a yellow minus where it fell`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    // The engine off, and its candidates and the labels' badges off the board: the pointer on one shows its line
    // or its note, in the place of the numbers of the point
    await page.addInitScript(display => {
      localStorage.setItem("learn-enclosure:engine:2", JSON.stringify({ on: false }));
      localStorage.setItem("hedge-school:consent:2", JSON.stringify({ games: "denied" }));
      localStorage.setItem("learn-enclosure:review-display:1", JSON.stringify(display));
    }, { judge, areaMap: { review: true, board: true }, mapStyle: "difference",
         layers: { regions: true, protected: true, candidates: false, marks: false, coordinates: true } });
    await page.setViewportSize({ width: 1376, height: 952 });
    await page.goto("/review");
    await loadReviewFile(page, FIXTURE);
    await page.waitForURL(/#game=/);
    await expect(page.locator("main.review")).not.toHaveAttribute("aria-busy", { timeout: 120_000 });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

    // The positions from move 10 on, until a Blue move and a Red move have each shown both signs
    const seen = new Set<string>();
    await toMove(page, 9);
    for (let k = 10; k < 60 && seen.size < 2; k++) {
      await page.keyboard.press("ArrowRight");
      await at(page, k);
      const mover = (await legend(page).textContent())?.match(/rose for (Blue|Red)/)?.[1];
      expect(mover, `the legend at move ${k}`).toBeTruthy();
      if (seen.has(mover!)) continue;
      let signs: Awaited<ReturnType<typeof signsOn>> = [];
      await expect.poll(async () => (signs = await signsOn(board(page))).length, { timeout: 30_000 }).toBeGreaterThan(0);
      const rise = signs.find(s => s.kind === "rise"), fall = signs.find(s => s.kind === "fall");
      if (!rise || !fall) continue;
      expectInks(signs, "light", `at move ${k}`);
      // The numbers under the pointer: the plus's point rose for the mover, and the minus's fell
      for (const s of [rise, fall]) {
        await page.mouse.move(s.x, s.y);
        await expect(legend(page)).toContainText(new RegExp(`${s.kind === "rise" ? "rose" : "fell"} \\d\\.\\d\\d for ${mover}`));
      }
      await page.mouse.move(0, 0);
      seen.add(mover!);
    }
    expect([...seen].sort(), "a Blue move and a Red move with both signs").toEqual(["Blue", "Red"]);

    // The last position's signs and the legend's two, a minus "fell for" and a plus "rose for", in each theme's
    // colours: the site follows the system's theme while the player has chosen none
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
      const marks = legend(page).locator("span:has(svg)");
      await expect(marks).toHaveCount(2);
      for (const [i, kind] of (["fall", "rise"] as const).entries())
        await expect(marks.nth(i).locator("path")).toHaveCSS("stroke", INK[theme][kind]);
      const signs = await signsOn(board(page));
      expect(signs.length, `the last position's signs, ${theme}`).toBeGreaterThan(0);
      expectInks(signs, theme, `at the last position, ${theme}`);
    }
  });
}
