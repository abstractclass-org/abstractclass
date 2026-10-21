# How deep a review searches, which result a position uses, and whose settings apply

**Status:** in force, and built. **Decided:** 2026-10-13.

## Context

A review searches the same position more than once, at several depths, for different reasons: a quick sweep, the
label pass, the confirmation of a Great, and the position the player looks at. Each search can end in the browser's
store, in a review file, and in another browser. The settings that set these depths can be the browser's
or the game's own. The rules are in designs 05, 09, 10 and 13. This document puts them in one place, with examples,
because together they make an interaction that is hard to see from any one of them.

## Decision

### 1. The depths that a review asks for

The settings here are the game's (section 4): its network, and its **depth per move**, D below. The rest of the engine
settings are always the ones kept in the browser.

| Search | Which positions | Visits |
|---|---|---|
| The sweep | every position of the game | 32, for the chart's first estimate |
| The label pass | every position of the game | D: Lite 512, Standard 1,024, Custom 256 to 16,384 |
| A Great's confirmation | the position after the engine's second choice (or the turn's other candidate) | D, or deeper: as deep as the position after the played move (section 3) |
| The position on screen | the one the player looks at | the Depth setting, P: 256 to 16,384, 1,024 by default, with a time limit (30 s by default) |
| A branch move evaluated on request | the branch's positions | D |

The engine searches the position on screen only when it holds less than P. A label shows from 256 visits on, at every D.
Every label of the review has D: a player who wants surer labels sets a deeper D.

### 2. Which result a position uses

- **One result for each position, the deepest.** A new result replaces the one held only when it has at least as many
  visits. A search still running counts with its visits so far. So a position looked at with a P above D holds the
  deeper result, and its labels follow it.
- **Everything follows the held results:** the labels of the moves into and out of the position, the report's counts,
  accuracy and points lost, the charts and their dots, and the Greats.
- **The review's own work counts the store's results only.** A search of a position to a budget is done when the
  store has a result with that budget. The results so far that the page shows do not count: the store never gets them
  when their search stops before its end (design 05).
- **From the store, the deepest too.** When a review opens, each position takes the deepest result stored for it at the
  visits asked or more (`cacheGetAtLeast` in `packages/analysis/src/cache.ts`). So a review opened again looks as the
  player left it, and a review file's deeper results count everywhere. An older review searched its worst moves at
  2 × D. The store keeps those results, and they count as any deeper result does.
- **The store keeps finished searches only.** It keeps a search's result once the search reaches its visits, under
  them. The page shows and uses a search stopped at its time limit while it is open, but the store does not keep that
  result (example 6).

### 3. The Greats compare equal searches

A move is Great when it is the engine's first choice, its second choice looks at least 10% of win chance worse in that
search, and a search of the position after the second choice confirms the gap against the position after the played
move (design 10). The two must be equal searches. So when the position after the played move holds a result deeper
than D, the confirmation searches as deep: the largest doubling of D within that result's visits (`equalDepth` in
`packages/analysis/src/model.ts`). Until it does, the move is Best.

### 4. Whose settings apply

- **The settings kept in the browser** are a convenience: the last ones chosen. There is no account, so there are no
  "my settings" to promise. They serve every game that has no settings of its own.
- **A game keeps the settings it came with** (`StoredGame.settings` in `src/lib/game/store.ts`): an imported review
  file's network and D, when the site ships that network, and a shared link's, when the site has the sender's network.
  Its review uses them. The game's engine settings say so and show them, and a change of either changes the game's
  only. The other settings (on or off, P, the time limit, the workers, the GPU) are the browser's in every game.

### 5. What leaves the browser

- **A review file** (design 13) carries every stored result of the game's positions, of its branches' positions, and of
  the positions one move from them (the Greats' confirmations), at every depth, and the finished review's network and
  D. An import with the file's settings searches nothing.
- **A share link** (design 13) carries the record, the branches, and the network and D. It carries no results: the
  recipient's browser runs the review's own searches (section 1), and gets the same results for them with the same
  engine search (on a GPU, the network's arithmetic differs a little: design 15). It does not carry the sender's deeper
  looks (example 9).

### 6. What the page says

- **The Depth's help line:** "How far to search it. Deeper than the review, it also updates the review there: the
  labels and the report."
- **The report**, when it applies: "N positions were searched deeper than the review, by the Depth of the position on
  screen: the labels there, and this report, use the deeper searches." It counts the game's positions whose result has
  at least 1.5 times D: the depths step by doublings, so such a result came from a deeper search. The 2 × D results of
  an older review count too.
- **The game's engine settings**, for a game that keeps its own: "This game keeps the network and depth per move it
  came with, from a review file or a shared link, so that its review is the one it came with. A change of them here
  changes this game's only."

## Examples

The examples use a game of 120 edges and HedgeFund 0.1 Lite, unless they say otherwise. They use the default settings:
Lite (D = 512), P = 1,024, and a time limit of 30 s.

1. **A review, as it runs.** The sweep searches the 120 positions to 32 visits, and the chart draws a faint line. The
   label pass searches them to 512, and the labels come. Say 3 moves are the first choice with a gap of 10% to the
   second: the positions after the 3 second choices go to 512, and the 3 moves become Great or stay Best. The report has
   no note: every result is what the review asked for.
2. **The player looks at a position.** The player steps to the position after move 40. It holds
   512, below P, so the engine searches it to 1,024, and the bar fills as it goes. The labels of the move into it and
   the move out of it follow the deeper result as it comes, and with them the counts, the accuracy and the chart. The
   report now says "1 position was searched deeper than the review". The search ends at 1,024, and the store keeps
   it.
3. **The page opens again.** Position 40 takes its stored 1,024 result, the deepest it has, so the labels, the report
   and its note are as the player left them.
4. **A deeper review depth.** With Standard (D = 1,024) and P = 1,024, a position looked at holds 1,024 already, so
   the engine does not search it again, and the report has no note. With P = 4,096, a position looked at goes to
   4,096, and the note counts it.
5. **A Great and a deeper look.** Move 52 is the engine's first choice, with a gap of 12% to its second choice. The
   position after the second choice holds 512. The player looks at the position after move 52 with P = 1,024. Now
   the two searches are not equal, so the engine searches the position after the second choice to 1,024 too. While
   it runs, move 52 shows Best. When it ends, move 52 is Great if the gap holds at 1,024, else Best.
6. **A time limit.** With P = 4,096 on a slow machine, the search of position 70 stops at its 30 seconds with 2,600
   visits. The page shows "time limit", and uses the 2,600 result: the labels and the report follow it. The store does
   not keep it, since the search did not reach 4,096. When the page opens again, position 70 takes its 512 result, and
   its labels and the report go back. The position is not searched again for the same P and time limit while the page
   is open.
7. **A review file, at the same settings.** Alice exports her finished review (Lite, 512). Bob, on Lite at 512 and on
   the same site, so with the same engine search, imports it. The game opens with every result, the Greats'
   confirmations among them, and the engine searches nothing. The game keeps Lite and 512, which are Bob's settings
   too.
8. **A review file with other settings, and deeper looks.** Alice reviewed with HedgeFund 0.1 at Custom 4,096, and
   looked at 10 positions with P = 16,384. Bob uses Lite at 512. He imports her file. The game keeps HedgeFund 0.1 and
   4,096, so its review uses her results and searches nothing, while Bob's other games stay at Lite and 512. The 10
   positions take their 16,384 results, the deepest stored, so Bob's labels are Alice's, and his report says "10
   positions were searched deeper than the review". In that game, Bob changes the depth per move to Standard: the game
   keeps HedgeFund 0.1 and 1,024 now, and his other games still use Lite and 512.
9. **A share link of the same review.** Alice shares a link of the same game instead. Bob's game keeps HedgeFund 0.1
   and 4,096, and his browser runs the review's searches: the sweep, the label pass at 4,096, and the
   Greats' confirmations. These give Alice's results. The link does not carry her 10 deeper looks, so at those
   10 positions Bob's labels are the review's own, and they can differ from Alice's until Bob looks there with
   P = 16,384. For everything, a review file is the way.
10. **A review file from before the Greats' confirmations were in it.** A file exported before 2026-10-13 holds the
    game's and the branches' positions only. Its import at the same settings searches the positions after the second
    choices again, and the bar shows "Reviewing: confirming Great moves" until they end. A new export of the review
    holds them.

## Why

- **The deepest result, everywhere.** A deeper search is the better answer, and the review already took it while it
  was on screen. Taking it from the store too makes the review the same before and after a reload, and after an
  import. The cost is that a review's labels come from mixed depths, as they did within a visit.
- **One depth for every label,** as the depth setting says. A search of the worst moves at 2 × D gave them about
  what a review at 2 × D gives them, for 31.2% of the review's visits ([decisions/product.md](../decisions/product.md),
  "The charts mark every label, and every label has the review's depth").
- **Equal searches for a Great** (En Croissant's rule, design 10): a gap between a deep search and a shallow one says
  more about the depths than about the moves.
- **The game's own settings:** an imported or shared review is someone's review, made with their settings. Keeping them
  with the game shows that review, without changing what the browser uses for other games.
- **No "my settings":** the browser's settings are a convenience, not an account's settings. A button to restore them
  would promise what the site cannot keep.

## Alternatives

- **The review's own depth from the store, and deeper results only where the player looks again:** a label could change
  after a reload, and a review file's deeper results showed only where the importer looked.
- **The worst moves at 2 × D,** after the label pass: they got about the labels that a review at 2 × D gives them,
  for 31.2% of the review's visits, and a move's depth then hung on how bad it looked.
- **The browser's settings changed by an import:** every later review used them, until the player changed them back.
- **A share link with the deeper looks:** they are results, not settings, and the link holds no results. A review file
  carries them.

## Consequences

- A label, the report and the chart can change while the player looks at positions with a Depth above the review's.
  The Depth's help line and the report's note say so.
- A search stopped at its time limit changes the review while the page is open, and not after it opens again
  (example 6).
- A share link gives the review's own searches, not the sender's deeper looks (example 9).
- The help page that will explain the review (decisions/open-items.md) is to say all this for players.

## Where it is

- The depths: `packages/analysis/src/cache.ts` (`SWEEP_VISITS`, `LABEL_VISITS`, `DEEP_VISITS`, `BUDGETS`),
  `packages/analysis/src/analysis.svelte.ts` (`focus`, `confirmGreats`, `greatNeeds`),
  `src/lib/analysis/engineSettings.ts` (`REVIEW_PRESETS`, `CUSTOM_REVIEW`, `DEPTHS`, `TIME_LIMITS`).
- The deepest result: `keep` in `packages/analysis/src/analysis.svelte.ts`, `cacheGetAtLeast` in
  `packages/analysis/src/cache.ts`.
- The Greats' depth: `equalDepth` and `confirmedOnly` in `packages/analysis/src/model.ts`.
- The game's settings: `GameSettings`, `setGameSettings` in `src/lib/game/store.ts`, `settings` and `changeEngine` in
  `src/routes/review/+page.svelte`.
- What leaves: `gameAnalyses` and `importReview` in `src/lib/game/reviewFile.ts`, `src/lib/game/share.ts`.
- What the page says: `deeperPositions` in `src/routes/review/+page.svelte`, the note in `highlights` and the panel's
  note in `engineSettingsPanel`, in `src/lib/review/ReviewView.svelte`.

## Log entries

- [decisions/product.md](../decisions/product.md): "A review shared by link, and the Greats in the review file", "A
  deeper search where the player looks: kept, and said", "A game keeps the settings it came with, and the key moments
  go one doubling deeper" (2026-10-13).
- [decisions/product.md](../decisions/product.md): "The review's custom depth up to 16,384 visits" (2026-10-18).
- [decisions/product.md](../decisions/product.md): "A search's budget is met only by a result in the store"
  (2026-10-20).
- [decisions/product.md](../decisions/product.md): "The charts mark every label, and every label has the review's
  depth" (2026-10-21).
- Designs [05](05-review-analysis.md), [09](09-engine-settings.md), [10](10-labels.md) and
  [13](13-export-import.md) hold each rule in its place.
