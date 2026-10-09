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

- **Import a game:** from a meaf.us game ID or link, and from a pasted move list.
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
