# Open items

**The one backlog:** all work still to do that is not in flight. What is in flight is in
[../handoff.md](../handoff.md), and nowhere else.

Rules:

- An item stays here until it is done. Then remove it, and write its result in its topic file.
- When work on an item starts, move it to the handoff. If the work stops unfinished, move it back here.
- Add new items at the end of their group.

## Foundations

- **Deploys:** a Cloudflare project, a deploy job that refuses local engine sources, long cache headers for
  `/engine/`. It waits for the first released engine build
  ([requests/03-release-artifacts.md](../requests/03-release-artifacts.md)).
- **Speed on a visitor's machine:** run the engine lab's whole-game review on an idle machine and on a typical
  laptop, with 1, 2, 4 and 8 workers, for b10c128 and b15c192. The first measurement ran on a loaded machine
  ([engine.md](engine.md), "The current module in a Web Worker").

## Milestone 1: a game report (design/01-analysis-tool.md, section 4)

- **The review's budget and pool size:** choose them from the speed on visitors' machines. KaTrain's schedule is the
  model: a fast sweep of the whole game (25 visits), then deeper searches where the player looks (500), and
  re-analysis on request ([research/01-ux-survey.md](../research/01-ux-survey.md), section 3). Keep within the memory
  of small machines (95 MiB an instance for b10c128, 244 MiB for b15c192).
- **A review in a hidden tab** runs slowly, because the browser lowers the tab's priority. Decide what the page does:
  tell the visitor, or accept it.

- **Ask meaf.us for an export:** a button or a public record link for finished games would replace the bookmarklet,
  which breaks when meaf.us changes its page. Its owner's choice: the owner of this site asks.
- **The board:** draw the position from the engine's state (edges, protected edges, regions, scores). Step through
  the moves.
- **The review:** analyse every position of the game in a pool of workers at a fixed budget. Show the margin graph,
  points lost per edge and per turn, and the engine's best line.
- **The noise floor:** search the same positions twice and measure how often the labels agree, before any label
  ships.
- **Label thresholds:** fit them on the archive (design 01, principle 3). This needs the archive analysed offline.
- **Which score measures points lost:** `scoreSelfplay` (the expected final margin) or `scoreLead` (the starting
  score that would make the game even, trained since 2026-10-05). Measure both on reviewed games before the labels
  move from win chance to points (design 01, principle 1). KaTrain uses the lead.

## Offline work (on the engine repository's GPU)

- **Analyse the archive** at a large budget, for the thresholds, the win curve by rating, and the noise floor. Ask
  first: the archive holds other players' games.

## The owner's feedback on the review, puzzles and import (2026-10-10)

The review on the engine and the meaf.us bookmarklet work (the bookmarklet checked on a real meaf.us game). To do:

- **The record's turn labels lose their letter** (the engine repository's design changed): `1. D10-G10 2. N11-Q10
  L10-N11`, a branch at a turn's second edge `4... M12-N9`. Change `record.ts` (read the new form, still accept
  `1b.`/`2r.` for old records), `writeRecord`, `meaf.ts`, and their tests. The move list on the page can keep a
  colour mark instead of the letter.
- **Candidates on the board:**
  - The numbers are the engine's order, and the board shows number 1 and the others within the Good band of it (at
    most 3). So it can show 1, 2, 4, which reads as a gap. Choose: renumber what the board shows (1, 2, 3), or show a
    fixed top three with the weak ones fainter.
  - The hover note: drop the edge's name (it saves space). Make number 1's note and the others' notes say the same
    kind of thing, and match the Analysis table (both absolute values, or both differences from number 1).
  - Hovering a row of the Analysis table highlights its candidate on the board, but number 1 is already fully opaque,
    so nothing changes for it. Give the hovered candidate a visible mark of its own (a halo or a thicker line), for
    number 1 too.
  - Hovering a candidate on the board, or a row of the table: highlight that row.
- **The move list:** hovering a move highlights its box.
- **Progress:**
  - The review in progress needs a clear indicator (a progress bar: the shape, then the labels), not text under the
    board. The side panel fills in gradually: show that it is still filling (for example, the counts marked as partial
    until the label pass ends).
  - The position's own search needs a progress bar too (visits so far against its budget).
- **The Analysis tab's layout:** the candidates table changes height from position to position, so the move list
  moves up and down. Give the table a fixed height (a fixed number of rows).
- **Learning from mistakes:** not a tab. Make it a mode of the Analysis panel, above the move list, as Lichess's
  "Learn from your mistakes" is, started from the Highlights button too. Make it teach. After a solve, play out the
  engine's line. Show what the game's edge allowed (the opponent's region, the points). Offer a hint before the
  solution (the area at stake).
- **Move input** (puzzles, retries, lessons): use the engine's rules. Today any point can start an edge and nothing
  checks cuts or protection. After the first point, show where an edge may go: meaf.us draws a dashed box of the reach
  and a ghost edge that shows whether the current choice is legal. Constellation highlights the points that complete a
  legal edge. Either works. The engine's `describe` gives the legal edges, and `play` checks one.
- **Sound:** sounds for moves, to make play more satisfying. To design: which events (an edge placed, a cut, a region
  closed and scored, a label for a mistake, a puzzle solved or failed), a sound set with its licence, a switch to mute
  it, and no sound before the player interacts (browsers block it).
- **The single-file build** (`SNAPSHOT=1` in `vite.config.ts`, `scripts/snapshot-fragment.cjs`) served only the
  artifacts, which are deleted. Remove it if the owner agrees.

