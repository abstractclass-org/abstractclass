# The review page's layout

**Status:** in force. **Decided:** 2026-10-10, from Lichess's analysis layout (its source at commit `c91f1d0`:
`ui/analyse/css/_layout.scss`, `ui/lib/css/abstract/_uniboard.scss`, `_variables.scss`).

## Context

The review page put the board and one side panel in a page at most 1,100 pixels wide, with the board at most 640.
Above the board were the players, the scores and the win-chance bar. Under it were the step controls, the board's
layer switches, a status line and the Advantage chart. On a 1,376 × 952 window the page was 1,038 pixels high, so
the chart was partly below the fold. On a maximised window of a 2,560 × 1,440 screen, about 1,400 pixels of width
stayed unused, while the height had room for a board of about 1,150 pixels.

Lichess sizes its Analysis board from the window, and keeps the board whole in view:

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
   column makes the board smaller on a window just above that width (655 pixels at 1,376 × 952, with the analysis
   column at its least):
   - **Three columns from 1,260 pixels:** the summary on the left, the board in the middle, the analysis on the
     right. The summary is the review's progress and the Report (the result and the counts). The
     analysis is the position's engine header, the candidates, the move list and the step controls. The Report is no
     longer a tab, so this layout has no tabs.
   - **Two columns from 800 to 1,260 pixels:** the board, and one right column with the tabs (Report, Analysis), as
     before. "Report" was "Highlights": a report is the more common name for a game's summary.
   - **One column below 800 pixels:** the board, then the right column's content.
   - **Widths:** the summary column 250 to 350 pixels (Lichess's side column). The analysis column 364 to 460 pixels:
     wider than Lichess's 240 to 400, because its candidates table has five columns and a scroll bar, and its move
     list by edge needs 321 pixels in the site's monospaced font (item 11).
   - **Height:** the side columns (the summary and the analysis) end where the window ends, less the page's margin
     (1rem), but never above the board's bottom edge. So the page fits the window, and when the board fills the
     height, they end with the board, so that the step controls stay in view. The move list takes the height that is
     left. The columns' end is measured again whenever the window, the board's column or the page changes size.
3. **The charts under the board, always in view** (Lichess's place): the board gives up some of its height for them,
   so the page still fits the window. Two tabs choose the chart, as Lichess's tabs choose among its charts (Computer
   analysis, Move times): "Advantage", shown first, and "Difficulty" (design 14). The tabs and the shown chart's
   legend share one row, and the chart takes the rest of the charts' area.
   - **The area's height** (`--chart`): what the window's height leaves after a board as wide as the columns allow,
     at least 6 rem and at most 12 rem. Where the board fills the window's height, the area is 6 rem and the board 6.5
     rem shorter. Where the width limits the board, the area grows into the height that is left. In one column the
     area is 8 rem. The side columns end with the charts' area.
   - **The charts' notes open above the chart,** over the board: under it there is no room before the window's edge.
   - **The Advantage chart's lines:** Blue's win chance, the score difference and the difference of the areas each
     player encloses now, each of the last two scaled to its own largest value, which reaches 70% of the way from the
     middle to the edge, and above the middle when Blue has more, as the win chance is. The legend names the lines only
     ("Win chance for Blue", "Score difference", "Area difference"), each name first giving what its line measures. The
     score line is teal (`--score`) and the area line magenta (`--area`), apart from the accent's lavender. **The
     chart's note** gives the move and its label, the engine's lead, then a line each for the score and the area of the
     lines shown, with the side ahead named ("Score: Blue +88.9"): the lines have no axis, so their numbers are only
     there. At the game's end the result replaces the score. **The score and area lines show or hide** in two ways: the
     display settings ("Score line", "Area line") say whether each shows when a review opens, and a box beside its name
     in the legend shows or hides it for the moment, without changing the setting. A line that is off by setting keeps
     its place in the legend, with its box clear. A click on a box does not focus it, so that the arrow keys still step
     through the moves. **The labels that the move list shows** (Great, Inaccuracy, Mistake and Blunder) are dots in
     their label's colour, 7 pixels wide: one for each such turn or edge, in the unit of "Judge by" and for the side
     shown, as many as the game has. A click on a dot goes to its move. By edge, in the narrowest chart (313 pixels at a
     window of 360), two labelled edges next to each other are 2.6 pixels apart, and the second dot covers most of the
     first (decisions/product.md, "The charts mark every label, and every label has the review's depth"). The dots are
     drawn in HTML, as the hovered point is: the chart's SVG stretches to the column's width, and in a column as narrow
     as the summary's, a circle in it is a thin ellipse. The chart's note takes at most the room beside the point, and
     wraps there. **While the review runs,** the line is faint where a position has only its first search (the sweep's
     32 visits), and full where its search has the review's depth. The legend then says "Win chance, first estimate",
     with "Refined as the review runs" as its tooltip, and a faint position's note says "first estimate". This marking
     is the site's own, not taken from a published tool. It was dashed at first, and read as the chart's dashed 50%
     line. **By turn** (design 10, "Review by"), the chart draws and snaps to the turns' ends only: a turn is one step,
     and its note names the whole turn. A note gives the label in brackets, as Lichess's chart does: "2. Q10-R8 O11-Q10
     [Blunder]".
4. **The step controls** (first, back, forward, last), the status line and the display settings' button are a bar at
   the bottom of the analysis column, as on Lichess, next to the move list that they step through. The steps are on
   the left, and the tools on the right (the Analysis board's Play, New and Export, the review's Export, and ☰). When
   the column is too narrow for one row, the tools go under the steps as a group, at the right, and the steps span the
   column's width, as Lichess's do. The bar measures whether the tools fit beside the steps at the steps' own width
   (`packages/review/src/StepBar.svelte`, which Practice shares). It measures as it mounts, before its first frame: a
   change after the first frame moves the buttons (a layout shift). The buttons' icons are drawn, one set at one
   stroke (`packages/site/src/Icon.svelte`), not text glyphs, whose shapes vary with the font.
   - **Play, New and Export are icon buttons,** at every width, so that the bar is the same on a phone and on a
     desktop. Play is a robot's head, the common sign for "play the computer": Play's usual icon, a triangle, is the
     step forward beside it, and the word Play between two icons broke the row of icons. New is a plus, the usual
     mark of a new document, tab or game. Export is an arrow up out of a tray, the share mark of phones' share sheets:
     its menu sends the game out as a link, a file or to a partner site, so a download's arrow would promise too
     little. Each has its name for a screen reader and as a tooltip ("Play the bot from here" for the robot). The
     order is the steps, then the robot, New, Export and ☰. ☰ is an icon already. In a game's row on the home page,
     Export keeps its word: the row is not the bar. Practice's tools (Takeback, Abort, Resign) do not change.
   - **On a phone, the bar is fixed to the bottom of the window** (one column, below 800 pixels), as the Lichess app
     keeps Previous and Next in a bottom bar (design 32, item 10). So the step back is in view whenever the board is.
     Under the move list, the bar was below the board, and on a 360 × 640 screen the two were never in view together.
     The rule is the shared bar's (`StepBar.svelte`, and `.step-dock` in `packages/review/src/review.css`), so every
     page with the bar takes it: the review, the Analysis board, Practice, and Openings when it comes.
   - **The bar spans the page's area,** with the page's padding, so that its buttons line up with the column. With a
     mouse, the area's scroll bar stays clear of it.
   - **The status line stays in the bar,** over the steps: it says what an edge on the board needs next.
   - **The tools stay beside the steps,** and go under them where they do not fit, as in a narrow column. At 360
     pixels every page's tools fit in one row: the review's (Export and ☰), the Analysis board's (Play, New, Export
     and ☰) and Practice's (Takeback, Abort, Resign and ☰). The review's bar and the Analysis board's are 68 pixels
     high, and Practice's, with no status line, 46. With New and Export as words, the Analysis board's tools did not
     fit, also at 390 pixels, and its bar had two rows, 108 pixels high: icons give one row with targets of the same
     size. At 360 pixels the Analysis board's row has 20 pixels to spare. A much wider font can still wrap it, so the
     wrap rule stays.
   - **The page keeps room for the bar** at its end, as high as the bar, so that the bar covers no last row and no
     control. The page's scrolling keeps clear of the bar too (`scroll-padding-bottom`): a focused element or a picked
     move comes into view above it. The bar gives its height to the page (`--step-dock`) whenever it changes.
   - **What the bar opens comes into view:** the display settings and Practice's question before Abort or Resign
     open under the board, which can be out of view. They scroll to the nearest edge of the window.
   - **The bar's bottom padding takes the phone's safe area** (`env(safe-area-inset-bottom)`). The value is 0 while
     the page does not ask for the whole screen (`viewport-fit=cover` in its viewport tag), and it does not now.
   - **The bar is over the page,** and under the menus, the dialogs and the notices. The consent notice covers it
     until the visitor chooses, and so does the ask to allow Analytics in its place (the card at the lower left). The
     note that says what an action did (the Export menu's toast) shows above the bar, so that it does not cover the
     steps and the button that it answers. On paper the bar is in its column: a fixed bar repeats on every sheet.
   - **Departures from the Lichess app's bar:** the bar holds the status line and the page's tools, not the app's
     database and Flip. A long press does not repeat a step.
5. **The win chance is a display setting:**
   - **A bar above the board** ("Top horizontal bar", the default): Blue on the left, Red on the right, as the players
     start. The players' tags flank it in one row: each player's name, then under it the score and the area the
     player encloses now, which each turn's end adds to the score. While the engine's line shows (design 07), the area
     is the one after the line's last drawn edge, in the accent colour.
   - **The bar is centred on the board:** each tag's column is as wide as the wider tag, so that the bar's 50% mark is
     at the board's middle. The bar's length is what the two tags leave. Practice's row is the same (design 24).
   - **Each tag has two lines,** its name over its numbers, at every width: the tags are narrow, so the bar between
     them is long, and the row has one height. The narrowest row takes three lines (the points, then the area): below
     27.5rem with the bar, and 21.25rem with the gauge, where the tags would meet. These widths are the row's own
     (container queries), set by a game's widest numbers (scores in the thousands) so that the bar keeps its 6rem. A
     game keeps one form throughout, so the board does not change size as the scores grow. The row's height is
     measured, and the board and the side columns take it. Until it is measured, the page takes the height of the
     lines that the row will have (`--strip`): three where the board, with a row of two lines, is 27.5rem wide or less
     (21.25rem with the gauge), else two. So the board has its size in the first frame of the skeleton and of the
     review. A row whose lines have other heights (another font) changes the board's size once it is measured, after
     the first frame (a layout shift).
   - **A vertical gauge beside the board** ("Side vertical gauge", as Lichess and chess.com draw it): Blue's share from
     the bottom, each side's percentage inside the gauge at its own end (Red's at the top, Blue's at the bottom), as the
     bar shows them at its ends. The percentages are small and written up the gauge, so the gauge is 1rem wide. A
     percentage shows when its side's part of the gauge is long enough for it. The players' names and scores stay in
     the row above the board, Blue on the left and Red on the right, as the players start, from the board's edge and
     with nothing between them. A list of the players, Blue above Red, would put Blue above Red next to a gauge that
     puts Blue below Red.
6. **Display settings open in the analysis column,** in the place of the engine header, the candidates and the move
   list (below 1,260 pixels, of the tabs), as Lichess's analysis menu takes the move list's place. The board stays in
   view, so each change shows as it is made. The menu button (☰, Lichess's in the same place) in the step controls' bar
   opens and closes them, and shows that they are open. The gear is the engine's, in the engine header (design 09).
   "Done" at the panel's top, away from ☰, and Escape close them too. The panel scrolls when the column is shorter
   than it.
   - **Grouped by where a setting shows,** as Lichess groups its analysis settings (Board, Move list): Review first, as
     it sets the whole page ("Review by" Turn or Edge, "Review for" Both, Blue or Red: design 10), then Board (the win
     chance's form, candidates, quality labels, regions, the area map, its style and its smallest value marked (design
     30), invincible edges, lines on the board "Animated" or "Static"), Move
     list (quality labels as "Badges" or "Text", notes on the key moves, the previews of played moves and of variations,
     variations and lines as "Pills", "Dots" or "Notation", design 07), Sound (move sounds and their volume, design 08),
     Keyboard (the list of keys and clicks, also on "?"), and Advantage chart (whether the score and area lines show
     when a review opens).
   - **Each setting says what it does,** in a short line under its name, always in view (Lichess shows a help video for
     the setting under the pointer, which a touch screen does not show).
   - **On and off is a switch** at the right of its name, as Lichess's settings. **A choice of two is a pair of
     buttons** under its name. Bits UI's Switch and RadioGroup give them their roles, focus and keys.
   - The settings are kept in this browser (no accounts yet). A settings page for the whole site can come later, when
     puzzles and lessons have settings too.
7. **The progress bars go by subject:** the position's search bar is in the position's engine header, at the top of
   the analysis (with the expected final margin, the lead and the visits). The review's progress bar is at the top of
   the summary (three columns), or at the top of the right column (fewer), over the tabs. It covers all of the
   review's own work, each part as wide as its share of the visits: the sweep, the label stage, and the Greats'
   confirmations ("confirming Great moves, 18 of 22"). After them, while the area map is on and the review's results
   lack their maps, the map stage is one more part ("Maps: 34 of 120", design 30): the review is done without it. The
   page counts the Greats' step from the labels found so far, so it grows as labels come. Every step counts a position
   only when the store has its result, not when another search's results so far reach the budget (design 05).
   The bar shows the step that its line names: the steps before are full, the later ones empty, though some of their
   work ends early, alongside (it shows when their step comes). The step's part never shows less than it showed before:
   when its count grows, it waits. Another review depth, network or game starts it again. A review opened again reads
   its results from the browser's store before it shows, and they count as searched (the sweep and the label stage).
   When every step has its results from the store, the review is complete before the engine's network loads. Its line
   then says "Review done" in the first frame, in place of "Loading the engine's network…", and its Export menu opens
   (design 13). The report does not say that its counts are partial: that sentence came and went as the network loaded,
   and moved the report's table (a layout shift). The network still loads for the searches that the player asks for (the
   position on screen, a line). Until then, the engine's panel shows the values of the position's stored result, and its
   search bar gleams once a search starts. **While the network loads, the engine header's line says "Loading the
   engine's network…"** in the place of the visits, on the review and on the Analysis board. So the panel says that a
   deeper search waits for the network, also when the review's line says "Review done". The header reads the same state
   as the review's line (the analysis's `engineReady`), and says the same words. So they show at the first load, and
   again while another network loads. A review snapshot (design 20) searches nothing, so its header does not show them.
   The words and the visits are two elements, and the search bar takes the line's free width. So the visits that replace
   the words are new on the page, and the switch and the gear stay in place: no layout shift. A review with a result
   missing says what loads, and then what runs. After Review again on a review snapshot (design 20), the review
   snapshot's analysis stays on screen until the new review's analysis replaces it, and the line says what loads.
   **While the review has work to run, the slot's second line says "A review in a hidden tab can be slower."** Its title
   says why: "When you cannot see this tab, the browser can give the review less processor time." Where the line is cut,
   as with a larger text size, its title gives the line in full before the reason, as the slot's other lines give their
   text. The browser gives a hidden tab's processes the lowest priority, so other programs that keep the processor busy
   come first (design 05). The line is in the slot's own height, so it moves nothing. It goes when the engine is off and
   when the review is done. A review that runs again because the site's engine changed gives that line to its reason.
   **While a bar's work runs, a light gleam sweeps it** (Lichess's `bar-glider`,
   `ui/lib/css/component/_bar-glider.scss`: 70 pixels wide, every 3 seconds), so that a slow step does not look stopped:
   the review's bar while its stages run, and the search bar while the position on screen is searched. With reduced
   motion asked for, there is no gleam. **The gleam is slower than Lichess's:** it crosses the bar in 2 seconds at any
   width, then waits 1 second. Lichess's gleam moves 3,400 pixels in 3 seconds, so it flashes across a bar of 400 pixels
   in about a third of a second. The gleam moves by a transform, not by its place (`left`): it asks for no layout in
   each frame, and moves nothing (a layout shift).
8. **Two kinds of number, one form each:**
   - **Who is ahead:** the side ahead is named, and the number is never below 0: "Red +105", whoever is to move, as Go
     writes "B+3.5". Even reads "0" among numbers and "even" in a sentence. So: the engine header ("Expected final
     margin Red +116 ± 325 · lead Red +105", at the end "Final margin Red +60.5"), the candidates table's Lead column
     ("Blue +22", and "Blue +1.2k" from 1,000), rank 1's note on the board ("Red wins 67.8% · lead Red +109"), a
     move's note ("Lead: Blue +38", the same word as the header's and the chart's) and the chart's notes. The win
     chance is the mover's, and its column names the side ("Red wins"). The gauge, the chart and the players' tags
     show both sides. Every note gives the lead and the loss in the lead to one decimal ("−143.3", "Lead: Blue
     +38.2"): a note is read closely. The move list, the header and the table give whole numbers.
   - **What a move cost:** the mover's loss against the engine's best. It needs no side: it is always the mover's. In
     the move list, the loss in the lead at the right of each move (by turn, of each turn), where Lichess's move list
     has its evaluation: "−136". In every note, the loss in win chance first and then the loss in the lead, each with
     its sign, the lead's with no unit: a move's note ("Blunder: −25.0% · −143.3 · Lead: Blue +38.2") and the other
     candidates' notes on the board, against rank 1 ("−4.0% · −26.3"). A plus marks a gain (a candidate after rank 1
     that looks a little better), and a value that rounds to 0 has no sign ("0.0% · 0.0").
   - Lichess and chess.com give every value from White's side. Here every advantage of Red's would then be a number
     below 0, and Red's player would read their own choices in reverse.
9. **No text selection on the review page:** the page's text is a
   tool's, not a document's, so it takes no selection (`select-none`), and the pointer stays an arrow over the move
   list's labels and marks instead of a text cursor. An engine error can be selected, to be copied. The board never
   took a selection.
10. **A skeleton while the rules read the game** (Nielsen Norman Group's skeleton screen): until the engine's rules
    have described every position, the page shows the review's layout without its content. The columns, the board and
    the charts' area have their sizes, the empty board shows its points, and grey bars stand for the text. The
    progress slot says "Reading the game with the engine's rules…", and the players' names show in its first frame.
    The review then takes the skeleton's place, part for part.
    - **One layout for both:** the skeleton is a snippet of `ReviewView.svelte` (`reviewSkeleton`), so it takes the
      review's styles. The row above the board uses the review's classes (`stripRow`, `playerBox`), with bars as high
      as the text, and the skeleton measures it as the review does. A narrow row takes two or three lines, and the
      board's size follows its height.
    - **The board's points are drawn with CSS** (`.board-points`), where `Board.svelte` draws them: 19 by 19, one
      unit apart, in a board 20.6 units wide.
    - **Only where the address names a game:** the skeleton shows once the page has read the game, so that the
      players' names are in its first frame. Names that came after it changed the cards' widths, and moved the row's
      parts (a layout shift). Before that, the prerendered line of text shows. The page prerenders as the Review tab
      (design 23), and CSS hides the line. Before the first paint, a script in the page's head marks an address that
      names a game. CSS then shows the line in the Review tab's place (design 22, "The Review tab").
    - With reduced motion asked for, the skeleton's bars do not pulse.
    - **The move list's rows come one frame after the rest** (`rowsDrawn`), in a task of their own. Until then the
      list's box shows grey bars that do not pulse: one element draws a bar for each turn, a turn's row apart (22
      pixels, `TURN_REM`). When the rows came with the rest, the review's first frame was one long task, so a click
      during it waited (Interaction to Next Paint, INP). In two and three columns the list's box has its height from
      the first frame, so the rows move nothing when they come. In one column the list's height follows its rows, and
      notes and variations make the rows taller than the bars. The review's list is in its Analysis tab there, which
      the first frame does not show. The Analysis board shows its list there, and draws the rows at once. Its step
      bar is fixed to the window's bottom in one column (item 4), so rows that come later move only the room at the
      page's end (abscls-pe11 asks whether it draws them later). A hidden page also draws them at once: it draws no
      frame.
11. **One monospaced font** (Lichess ships its own fonts): Fira Code, shipped with the site
    (`@fontsource-variable/fira-code`, its weight axis), 0.6 em a character. The move list's columns are sized in
    characters, so a system's own font would set their width: Consolas, on Windows, is 0.55 em, and the Mac's and
    Linux's are 0.6 em, which ran the move list by edge 20 pixels past the analysis column at 340 pixels, its least
    width then. With one font the rows measure the same everywhere: 321 pixels. The analysis column's least width is
    364 pixels, so that the move list has 325. Fira Code was chosen by its look, from six fonts side by side in the
    move list. Its ligatures are off (`--font-mono--font-feature-settings` in `packages/site/src/site.css`): a record's
    text must show as it is, and a ligature changes it (the game id k3x9q showed as k3×9q, and "??" as one glyph).

## Why

- **The board is the work surface.** A review is read on the board: the candidates, the regions, the labels. A board
  that fills the height is as large as the window allows, and stays whole in view, as on Lichess and chess.com.
- **More space shows more at once.** With a third column, the Report and the analysis no longer share one panel,
  so the player sees the summary and the move list together.
- **The controls sit where the eye is.** The step controls by the move list keep the board's column free and the board
  large. On a phone the eye is on the board, and the thumb is at the screen's bottom: the bar is fixed there.
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
- **The systems' own monospaced fonts, with the wider analysis column:** no download, but a layout that still
  changes with the system.
- **Inconsolata** (0.5 em, drawn after Consolas): it fits the analysis column at 340 pixels, with 20 to spare, so the
  board keeps its size. Fira Code read better in the move list.
- **Smaller move text:** the room as it was, but smaller moves for everyone.
- **A sticky step bar on a phone** (`position: sticky`) in place of a fixed one: a sticky element stays inside its
  parent, so the bar rises no higher than the top of the analysis column, under the board.
- **Smaller buttons in the step bar on a phone,** so that the Analysis board's tools fit in one row as words: smaller
  targets on a touch screen, and two rules for one bar.
- **New and Export as icons on a phone only:** the bar would differ between a phone and a desktop.
- **Play as a word between the icons:** it broke the row of icons. **Play as a triangle:** the step forward is a
  triangle beside it, so the two would read as one control.

## Consequences

- The board, its candidates, notes and labels scale with it: they are drawn in the board's own units (SVG).
- The move list is taller on a tall window.
- The page must be checked at the column switches (800 and 1,260 pixels), on a common laptop window, and maximised on a
  large screen. On a phone (360 × 640), the step back must be in view wherever the board is, and the bar must cover no
  control at the page's end. The layout test checks it (`tests/layout.spec.ts`, "the step bar on a phone").
- On a phone the bar covers the bottom of the window while the page scrolls: 46 to 68 pixels.
- The display settings' panel is the place for later display settings (sound, board zoom). It has room for them: it
  scrolls in the column.
- Learning from mistakes, when it becomes a mode of the analysis (decisions/open-items.md), takes the place of the
  candidates and the move list in the analysis column.

## Where it is

- `packages/review/src/ReviewView.svelte`: the columns, the board's size, the engine header, the controls' bar, the
  display settings' panel (`settingsPanel`). Hedge School's part of the view, Enclosure's:
  `src/lib/review/enclosureView.ts` (design 29, item 9).
- The parts that Practice shares (design 24): the row above the board (`packages/review/src/PlayerRow.svelte`,
  `PlayerCard.svelte`), the win bar and gauge (`packages/review/src/ShareBar.svelte`), the move list's look
  (`packages/review/src/moveList.ts`), and the settings' rows (`packages/site/src/SettingChoice.svelte`,
  `SettingToggle.svelte`, and Hedge School's `src/lib/ui/SoundSettings.svelte`).
- `src/lib/review/display.ts`: the display settings and their storage in the browser.
- `src/routes/review/+page.svelte`: the skeleton until the review shows (`gameOpen`, `preloaded`).
- `packages/site/src/site.css`: the monospaced font (`--font-mono`, and the font's import).
  `packages/review/src/review.css`: the step bar on a phone (`.step-dock`, and the room for it at the end of the page's
  area, `#page`).
- `packages/review/src/StepBar.svelte`: the step bar, its tools' wrap, and its height for the page (`--step-dock`).
  `packages/site/src/pageScroll.ts` (`intoView`): what the bar opens comes into view.

## Log entries

- [decisions/product.md](../decisions/product.md), "The review page's layout".
- [decisions/product.md](../decisions/product.md), "The review's first frame".
- [decisions/product.md](../decisions/product.md), "The Review tab before the page's code runs".
- [decisions/product.md](../decisions/product.md), "A search's budget is met only by a result in the store"
  (2026-10-20).
- [decisions/product.md](../decisions/product.md), "On a phone, the step bar stays at the bottom of the screen"
  (2026-10-24).
