# Design documents

Each document explains one decision that is still in force: the context, the decision, why, the alternatives, the
consequences, where it is in the code, and links to the log entries. The decision logs
([../decisions/](../decisions/README.md)) are the archive.

Engine, rules, fork and protocol decisions are in the engine repository's design documents
([`docs/design/`](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/README.md) and
[`v2/docs/design/`](https://github.com/seankao31/enclosure-ai/blob/main/v2/docs/design/README.md)). This folder holds
product decisions.

| # | Document | In short |
|---|---|---|
| 01 | [A game analysis tool for human players](01-analysis-tool.md) | What the tool does and why, from Lichess, KaTrain, Maia, KataGo and papers: points lost, fitted thresholds, difficulty, a human model, puzzles, tags, distilled rules, concepts. |
| 02 | [A static site, with the analysis on the player's CPU](02-static-site.md) | Static files. The engine as versioned artifacts from the engine repository. One module instance per Web Worker. Heavy work offline on the GPU. An engine interface of our own design. |
| 03 | [The stack](03-stack.md) | TypeScript, SvelteKit (static), Vite, Cloudflare. Engine artifacts pinned by SHA-256: releases for deploys, local builds for development. |
| 04 | [The product's shape](04-product-shape.md) | Static now, a server later. Explanations from templates over engine facts. Desktop first, phone usable. Plain and clear, with a few rewards. |
| 05 | [The review's analysis](05-review-analysis.md) | KaTrain's schedule (rules, a sweep, deeper where the player looks), results kept in the browser. |
| 06 | [The review page's layout](06-review-layout.md) | The board fills the height. Lichess's columns: summary, board, analysis from 1,260 px, tabs below that. The chart under the board. The win chance as a bar (default) or a gauge. Display settings in a panel in the analysis column, grouped by where they show, each with a line of help. |
| 07 | [The engine's lines and the player's variations](07-lines-and-variations.md) | A candidate's line on the board on hover (KaTrain's), numbered, one edge at a time, with its cuts and regions, cut where its visits run out. One line listed under the table; a click plays it as a branch. The game as a tree (Lichess's), branches in the move list by turn, as dots (Go's way, no notation) or text, kept in the browser. Ranks in rounded squares, line numbers in circles. The player's moves always on. |
| 08 | [Move sounds](08-sound.md) | A recorded crayon stroke (five CC0 strokes from one recording, chosen by ear) for every edge. On a step forward, a move played or clicked; jumps silent. On by default, with a switch and volume. |
| 09 | [The engine's settings](09-engine-settings.md) | The engine's switch and gear in the engine header (Lichess's engine box). The position on screen's visits (256 to 16,384) and time limit (KaTrain's: whichever first), the review's depth (Lite, Standard, Custom), the network by its parameters, and the workers. Kept in this browser. Applied without a reload. |
| 10 | [How a turn or an edge gets its label](10-labels.md) | Every label rule in one place: by turn (the default) or by edge, losses across positions, the worse of two bands, Best (the engine's own move, a turn in either order), Great confirmed by equal searches, and the special cases (one-edge turns, passes, branches on request, a turn's note, key moments). |

To add a document: give it the next number, use the same sections, and link it here. When a decision is replaced,
mark the old document "Status: replaced by NN" instead of deleting it.
