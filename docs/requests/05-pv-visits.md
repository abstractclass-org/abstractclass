# The visits behind each move of a line: KataGo's `includePVVisits`

**Status:** done, with no protocol change (engine repository commit `0886496`). The module the site has (build
`319a5c4`, protocol 0.3) takes `includePVVisits: true` and adds `pvVisits` and `pvEdgeVisits` to each move in
`moveInfos`. Design 04 lists both under "The fields", with their meanings, and the query field under "What a reply
holds". The engine repository checked that `pvVisits[0]` equals `visits` and `pvEdgeVisits[0]` equals `edgeVisits` (all
182 moves of 10 positions at 1,000 visits). One correction to the check below: the numbers can grow along a line. With
graph search, a position that another order of moves also reaches collects visits from both paths. `pvVisits` grew
along 2 of 132 lines. `pvEdgeVisits` grew along none, but it can in principle, and it was never above `pvVisits`. To end
a line where the search thinned out, read `pvEdgeVisits` and stop at the first move under the threshold. The site does
so (decisions/product.md, "The engine's line: where it stops").

## What

In the engine protocol (the engine repository's design
[`docs/design/04-notation-and-protocol.md`](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md)),
take KataGo's analysis query option `includePVVisits` (its `docs/Analysis_Engine.md`):

- **The query field** `includePVVisits: true`, as KataGo's analysis engine takes it.
- **The reply fields** of each move in `moveInfos`, as KataGo writes them with that option:
  - `pvVisits`: for each move of the move's `pv`, the visit count of the position after it.
  - `pvEdgeVisits`: for each move of the `pv`, the count of visits through it. With graph search it differs from
    `pvVisits`, as `edgeVisits` differs from `visits` (design 04, "The fields").
- **List both** among the kept fields, with their meanings, and the query field among the query's fields.

If the protocol should name or shape them in another way, the site follows the protocol.

## Why

The review now shows the engine's line of a candidate on the board: the candidate and the edges after it from its
`pv`, numbered ([decisions/product.md](../decisions/product.md), "The engine's line on the board"). A line goes as deep
as the search went, and its last moves can rest on a visit or two, where they mean little. Today the site shows a line
only for a candidate with enough visits (15% of the most visited candidate's, the board's own rule), and it cannot see
where inside a line the search thinned out. With the visits of each move, the board can stop a line where its visits
fall below a threshold, so that every edge it draws was searched.

## Done when

A query with `includePVVisits: true` gives `pvVisits` and `pvEdgeVisits` for each move in `moveInfos`, one number for
each move of its `pv`, and design 04 lists them. Checked: in a reply, a move's `pvEdgeVisits[0]` equals its
`edgeVisits`, and the numbers do not grow along the line.
