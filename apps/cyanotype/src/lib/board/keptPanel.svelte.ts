// The board's room on a page (design 33, "Practice against Stamp Duty", the layout): the hands in a panel over the
// board on a computer, and under the board in one column, and the panel's place and size as the player leaves them,
// kept in this browser. Practice, the review and the Analysis board take the same panel.
import { readLocalJson, writeLocal } from "@abstractclass/storage/local.ts";
import { PANEL_KEY } from "../site.ts";
import { FIRST_PLACE, FIRST_SIZE, type PanelPlace } from "./panel.ts";
import type { Size } from "./view.ts";

/** Where the hands go in a window `width` pixels wide: in a panel over the board, or under the board below 800 pixels,
 *  where the pages have one column. */
export const handsAt = (width: number): "panel" | "under" => (width > 0 && width < 800 ? "under" : "panel");

/** The board's box in one column: the window's height less the header, the row above the board (--strip), the step bar
 *  fixed under it and the margins, and at least a square field with its hands under it, each a third of the board's
 *  width high, 104 pixels at most, with 6 pixels between (Board.svelte). A page sets it as a custom property on an
 *  element that has --strip: a CSS build of calc() with min() inside max() stops Vite, so it is not in a class. */
export const ONE_COLUMN_HEIGHT = "max(calc(100dvh - var(--site-header) - var(--strip) - var(--step-dock, 0px) - 1.5rem), " +
                                 "calc(100cqw - 2rem + 2 * min(104px, (100cqw - 2rem) / 3) + 12px))";

const finite = (...n: unknown[]) => n.every(v => typeof v === "number" && Number.isFinite(v));

/** The panel's place and size, kept in this browser as they change. Call it as a component starts. */
export function keptPanel(): { place: PanelPlace; size: Size } {
  const kept = readLocalJson<{ place?: PanelPlace; size?: Size }>(PANEL_KEY);
  const panel = $state({
    place: kept?.place && finite(kept.place.fx, kept.place.fy) ? kept.place : FIRST_PLACE,
    size: kept?.size && finite(kept.size.width, kept.size.height) ? kept.size : FIRST_SIZE,
  });
  $effect(() => writeLocal(PANEL_KEY, JSON.stringify($state.snapshot(panel))));
  return panel;
}
