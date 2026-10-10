# What the product needs from the engine protocol

**Status:** done. The engine repository's answer is its design
[`docs/design/04-notation-and-protocol.md`](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/04-notation-and-protocol.md)
(protocol 0.1, which builds before the 0.x numbering report as 1.0; KataGo's analysis protocol as JSON lines) and the WebAssembly module `enclosure-engine.wasm` (build
`8195171`), which the site now uses ([decisions/engine.md](../decisions/engine.md), "The engine protocol in the
browser"). Still to come there: a `seed` field, the human model, and the same protocol in the native engine for the
offline jobs. This request does not design them. It lists what the product needs, and why, so that the design can
cover it.

The product: a static site that reviews games, labels moves, and later offers puzzles and training
([design/01-analysis-tool.md](../design/01-analysis-tool.md), [design/02-static-site.md](../design/02-static-site.md)).
The engine runs in the visitor's browser: one module instance per Web Worker, one thread each. Offline jobs run the
native engine on the GPU, for puzzle mining and deep searches.

## The analysis

1. **Every candidate's statistics:** visits, win value, score mean (`scoreSelfplay`), score spread (`scoreStdev`),
   prior, and the line (principal variation). Every visited root child, with no cap of 32. KaTrain's points lost and
   complexity, and Regan & Haworth's skill model, need the values of the alternatives, not only the best move.
2. **The policy over every legal move**, also the moves with no visits. Complexity weights the candidates by the
   prior. Puzzles need to know which moves look natural.
3. **The root's values,** from the search and from the network alone (no search). The raw values show how much the
   search changed the network's opinion, which helps to choose puzzles.
4. **The ownership** of the position (per point), and on request per candidate. It shows a player where the
   territory is won or lost.
5. **The other trained heads that can teach,** such as the edges that get cut (weak walls) and the future nodes. Tell
   which heads are trained.
6. **A human model by rating, later:** a place in the protocol for a rating-conditioned human policy (KataGo's
   `humanSLProfile` and `humanPolicy`), for principle 5 of the design.

## Positions

7. **From a move list,** including the turns that a clock timeout forfeits (the archive records them as passes).
8. **From a full position** (edges, protected edges, scores, player to move, edges left in the turn), as the native
   analysis engine's `enclosurePosition` does. Puzzles and set-up positions have no move list.
9. **The move notation** that people read, for import and display. meaf.us shows `A10-D10`. The site needs one
   canonical text form for each edge, and needs to accept both directions of an edge.

## The rules for the board

10. **The board needs the rules, and the site must not hold a second rules engine.** From the engine, for a position:
    each player's edges and nodes, the protected edges, the regions (as polygons, with their areas), the scores, the
    player to move and the edges left in the turn, the legal moves, and the outcome. For a move: whether it is legal,
    and what it cuts.
11. **The rules before the network:** the board must work while the network downloads (7.6 MB to 21.7 MB on the first
    visit). A small rules-only module, or a module that loads the network on demand, would do it.

## Running in a browser

12. **Results during the search, and a stop,** in one thread with no `SharedArrayBuffer`. The worker can only read a
    stop message when the module returns control to it. So the search must run in slices (for example a number of
    visits or milliseconds a call), with the current results after each slice, and must continue the same tree in the
    next call.
13. **Reproducible results:** the same request, seed and build give the same result, whatever requests came before.
    A label must not change when a visitor analyses the same game twice. Tree reuse across positions is an option,
    off by default.
14. **The network apart from the module:** the module loads the network's bytes at run time. Then the browser caches
    the code and each network separately, and the site can offer a fast network and a strong one with one module.
15. **Low cost a request:** a whole-game review sends about 120 requests to each instance. The current interface
    needs the site's list of legal moves in each request. The site has no rules engine, so it sends all 17,328 move
    IDs. The cost is in [decisions/engine.md](../decisions/engine.md).
16. **Memory for each instance,** stated, because the site runs several instances at once.

## Versions and provenance

17. **An information reply:** the protocol version, the engine build, the model (name, training step, SHA-256), the
    rule variant, and which outputs are trained.
18. **Each result names the build and the model** that made it. Precomputed analyses and puzzles ship as JSON, and
    each one must say what made it.
19. **One protocol for the module and the native engine,** so the site and the offline jobs read results with the
    same code.

## Done when

The site's engine worker drops the Meridian interface (`src/lib/engine/meridian.ts`) and gets each item above from the
new protocol. The engine lab ([`src/routes/lab/engine/`](../../src/routes/lab/engine/+page.svelte)) shows them.
