# The review page's layout

**Status:** in force. **Decided:** 2026-10-10, from Lichess's analysis layout (its source at commit `c91f1d0`:
`ui/analyse/css/_layout.scss`, `ui/lib/css/abstract/_uniboard.scss`, `_variables.scss`).

## Context

The review page put the board and one side panel in a page at most 1,100 pixels wide, with the board at most 640.
Above the board were the players, the scores and the win-chance bar. Under it were the step controls, the board's
layer switches, a status line and the Advantage chart. On a 1,376 × 952 window the page was 1,038 pixels high, so
the chart was partly below the fold. On a maximised window of a 2,560 × 1,440 screen, about 1,400 pixels of width
stayed unused, while the height had room for a board of about 1,150 pixels.

Lichess sizes its analysis board from the window, and keeps the board whole in view:

- **The board's size** is the smaller of two limits, times a zoom setting that the player chooses: the window's
  height, less the site's header and 1rem, and the width left after the other columns at their least width.
- **One column** below 800 pixels wide in portrait: the board, then the tools.
- **Two columns** from 800 pixels: the board with a vertical evaluation gauge, and the tools (240 to 400 pixels wide),
  as high as the board. The step controls are under the tools. The rest (the chart among it) is under the board.
- **Three columns** from 1,260 pixels: a side column (250 to 350 pixels: the game's information) on the left of the
  board.

## Decision

1. **The board fills the height.** Its size is the smaller of the window's height (less the site's header, the bar
   above the board when it shows, and a margin) and the width left after the side columns at their least width. No
   fixed limit. A zoom setting can come later.
2. **The columns follow Lichess's widths,** and its fixed switch to three columns at 1,260 pixels, although the third
   column makes the board smaller on a window just above that width (694 pixels against 846 at 1,376 × 952):
   - **Three columns from 1,260 pixels:** the summary on the left, the board in the middle, the analysis on the
     right. The summary is the review's progress and the Highlights (the result, the counts, the biggest mistakes).
     The analysis is the position's engine header, the candidates, the move list and the step controls. Highlights
     is no longer a tab, so this layout has no tabs.
   - **Two columns from 800 to 1,260 pixels:** the board, and one right column with the tabs (Highlights,
     Analysis), as before.
   - **One column below 800 pixels:** the board, then the right column's content.
   - **Widths:** the summary column 250 to 350 pixels (Lichess's side column). The analysis column 340 to 460 pixels:
     wider than Lichess's 240 to 400, because its candidates table has five columns and a scroll bar.
   - **Height:** the side columns (the summary and the analysis) reach down to the Advantage chart's bottom edge when
     the whole chart is in the window, so that the columns end on one line. The chart's legend stays below that line,
     as a caption. When the chart does not fit in the window (the board fills the height), the side columns are as
     high as the board's column, so that the step controls stay in view. The move list takes the height that is left.
3. **Under the board:** the Advantage chart and its legend, as Lichess puts its chart under the board. It is below the
   fold when the board fills the height.
4. **The step controls** (first, back, forward, last), the status line and the display menu are a bar at the bottom of
   the analysis column, as on Lichess, next to the move list that they step through.
5. **The win chance is a display setting:**
   - **A bar above the board** (the default): Blue on the left, Red on the right, as the players start. The players'
     names and scores flank it in one row.
   - **A vertical gauge beside the board** (the option, as Lichess and chess.com draw it): Blue's share from the
     bottom, each side's percentage inside the gauge at its own end (Red's at the top, Blue's at the bottom), as the
     bar shows them at its ends. The percentages are small and written up the gauge, so the gauge is 1rem wide. A
     percentage shows when its side's part of the gauge is long enough for it. The players' names and scores stay in
     the row above the board, Blue on the left and Red on the right, as the players start, from the board's edge and
     with nothing between them. A list of the players, Blue above Red, would put Blue above Red next to a gauge that
     puts Blue below Red.
6. **Display settings** are in a menu on the review page, opened from a button in the step controls' bar, as
   Lichess's analysis menu: the win chance's form, the board's layers (candidates, move labels, regions, protected
   edges) and the chart's score line. The menu is raised above the panel (a lighter surface, a border and a shadow),
   and the button shows that it is open. The settings are kept in this browser (no accounts yet). A settings page for the whole
   site can come later, when puzzles and lessons have settings too.
7. **The progress bars go by subject:** the position's search bar is in the position's engine header, at the top of
   the analysis (with the expected final margin, the lead and the visits). The review's progress bar is at the top of
   the summary (three columns), or at the top of the right column (fewer), over the tabs.

## Why

- **The board is the work surface.** A review is read on the board: the candidates, the regions, the labels. A board
  that fills the height is as large as the window allows, and stays whole in view, as on Lichess and chess.com.
- **More space shows more at once.** With a third column, the Highlights and the analysis no longer share one panel,
  so the player sees the summary and the move list together.
- **The controls sit where the eye is.** The step controls by the move list keep the board's column free and the board
  large.
- **The bar is the default** because the players start on the left and the right of the board: a horizontal bar
  matches the board's sides. The gauge is for those who prefer it.

## Alternatives

- **A larger fixed limit:** simpler, but a large screen still leaves space unused.
- **Two columns with the chart in the right panel** (chess.com's review): nothing under the board, but the summary
  and the analysis still share one panel.
- **Three columns at every width:** narrow windows would get a small board.
- **The vertical gauge as the default:** the bar matches the game's left and right sides.
- **The players at the top of the summary column with the gauge,** to give the board the row's height (2.1rem): the
  list put Blue above Red, against the gauge's Blue below Red.
- **A settings page for the site:** one place for every choice, but a page away while reviewing.

## Consequences

- The board, its candidates, notes and labels scale with it: they are drawn in the board's own units (SVG).
- The move list is taller on a tall window.
- The page must be checked at the column switches (800 and 1,260 pixels), on a common laptop window, and maximised on a
  large screen.
- The display menu is the place for later display settings (sound, board zoom).
- Learning from mistakes, when it becomes a mode of the analysis (decisions/open-items.md), takes the place of the
  candidates and the move list in the analysis column.

## Where it is

- `src/lib/review/ReviewView.svelte`: the columns, the board's size, the engine header, the controls' bar, the
  display menu.
- `src/lib/review/display.ts`: the display settings and their storage in the browser.

## Log entries

- [decisions/product.md](../decisions/product.md), "The review page's layout".
