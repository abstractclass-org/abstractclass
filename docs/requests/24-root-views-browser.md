# Blueprints' browser engine searches the root's views

**Status:** done: engine repository commit `d9d355e4` (abscls-il4e.9), to check here with Drawing Board's review
(abscls-8tl1.7). **Asked:** 2026-10-29.

## What

The engine's network sees a view of Blueprints' board, round the mover's last placements, and it places a blueprint
only with all its cells in the view. Since abscls-il4e.7 the analysis engine and GTP also search the root's views: a
position whose legal placements lie outside the rule's view gets a search in more views. Drawing Board's browser
engine (`blueprintsprotocol.cpp`) did not. This request asks for the same search there. It changes item 3 of request
23: a placement outside the view can now be a candidate.

1. **The candidates of every view,** by their site strings, with their visits, win chance and lead. The engine's best
   move can then be a placement outside the rule's view.
2. **The root's values** over all the views: its win chance and its lead.
3. **The ownership,** for the area map (design 30). Whether the rule's view's ownership is enough stays open until
   Drawing Board's review is designed (abscls-8tl1.7).
4. **Not the network's raw values at the root** (`rawWinrate`, `rawLead` and the others). Only Hedge School's engine
   page in the lab shows them, so a reply of more views can leave them out.
5. **The same reply for the same query and seed,** as each search gives now.

## Why

- **The review must see every legal move.** The engine measured that 6.3% of the site's positions need more than one
  view (abscls-il4e.1). In those positions, a search of the rule's view alone can miss the best move. Then the review
  calls a good move a mistake or gives the wrong best move.
- **The review values a move played by the position after it** (design 10), as Hedge School's does. So a move played
  outside the view needs nothing new: the engine already plays it and describes the positions after it.
- **The site's engine and the analysis engine must agree.** The same position gets the same search on the owner's
  machine and in the visitor's browser.

## Done when

- The engine repository's documents give the field, the reply of more views and the ownership's frame.
- Drawing Board's review checks, on positions of more views, that the best move can lie outside the rule's view and
  that the site reads every candidate as a placement.

## Delivered

The browser engine's search of the root's views, in engine repository commits `bbfe27a8`, `c06a1816` and `d9d355e4`
(KataGame `e2b3361e`). The engine repository's `games/blueprints/README.md`, "The search of the root's views", gives
the protocol, and its `games/blueprints/docs/decisions/port.md` the decision.

- **The field `rootViews`** of an analysis, true or false. Its default is the module's setting, true.
- **When the rule's view holds every legal placement** (about 72% of the site's positions), the search and the reply
  are the same as before, byte for byte.
- **A reply of more views:** `moveInfos` has the candidates of every view by their site strings, and `checkVisits` for
  the candidates that a second search checked. `rootInfo` has the best candidate's values, `views` (the cover) and
  `searches`. It has no raw values. `describe` gives `views` too.
- **The ownership and the policy** are those of the rule's view. A far view's ownership would need each pass's map
  with its view in the reply.
- **An error:** when no pass finds a candidate (a `maxVisits` of 6 or less with 3 views), the reply is an error with
  the field `maxVisits`. The site's budgets are larger, but the site must show the error as a failed request.
- **The protocol is 0.7.0** (engine repository commit `b64eea10`). By the engine repository's design 04, a reply
  with no raw values and the new error are breaking changes, and a breaking change takes the next minor version at
  once, also before a release. The shared engine package (`packages/engine`) then takes each site's protocol: 0.6.x
  for Hedge School, 0.7.x for Drawing Board (abscls-8tl1.14).
