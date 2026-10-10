# Document `edgeVisits` and `order` in the engine protocol

**Status:** open.

## What

In the engine repository's design
[`docs/design/04-notation-and-protocol.md`](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/04-notation-and-protocol.md),
"The fields":

- **List `edgeVisits`** among the kept fields of a move (`moveInfos`). The replies already carry it: the protocol
  drops only `scoreMean`, `noResultValue`, `rawNoResultProb` and `isSymmetryOf` (`dropGoFields` in
  `katago/cpp/command/enclosureprotocol.cpp`).
- **Say what `visits` and `edgeVisits` mean** for a move. In KataGo (`search/searchresults.cpp`, the analysis JSON),
  `visits` is the child node's visit count, and `edgeVisits` is the count of visits through the move. With graph
  search they differ when a position is reached by more than one order of moves, which is common in Enclosure: a
  turn's two edges in either order reach the same position.
- **Say what `order` means:** KataGo's ranking by play selection value (`AnalysisData`'s `operator<`). That is each
  move's weight, less the visits it got only for exploration, and the move with the best lower confidence bound
  among those with `minVisitPropForLCB` of the top weight lifted to the top. So `order` 0 can have fewer visits than
  `order` 1.

Please correct any of these readings that is wrong.

## Why

The review counts a candidate's visits to decide which candidates the board shows: KataGo's own rule, 15% of the most
visited move's weight ([decisions/product.md](../decisions/product.md), "The candidates: which ones the board shows,
and the engine's order"). It reads `edgeVisits` for that, as KataGo's LCB check does. A field that the design does not
list can be dropped in a later version without notice, and the protocol is at 0.x, where any version may break a
client.

## Done when

Design 04 lists `edgeVisits` with its meaning against `visits`, and gives the meaning of `order`.
