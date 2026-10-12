# The site's network at fewer visits: the GPU visit ladder analysed

**Status:** done on 2026-10-12, and checked here (below, "Delivered"). **Asked:** 2026-10-12.

## What

Analyse some games of the engine repository's GPU visit ladder (`runs/v2-gpu-visits/arena/games.jsonl`) as request 09
analyses the gauntlet's ([09-bot-games-analysis.md](09-bot-games-analysis.md)), with the site's network and request
07's settings ([07-archive-analysis.md](07-archive-analysis.md)).

**The games:** those between the site's network and itself at two budgets (`kg:v2a:b10c128-s46923648-d9407005`), from
16 against 32 visits to 512 against 1,024: six pairs of 64 games, 384 games in all. The ladder's ratings
(`runs/v2-gpu-visits/arena/ratings.json`): 744 at 16 visits, 934 at 32, 1,095 at 64, 1,243 at 128, 1,352 at 256, 1,432
at 512, 1,547 at 1,024.

- The players are the network that judges them, with less search, so their errors are those of a shallow search
  only. The gauntlet's players of request 09 err otherwise: other networks, other training. The two complement each
  other.
- The last pair plays at the judge's own depths (512, the review's Lite, and 1,024, Standard). Its labels show how
  often a measure flags moves that are as good as the judge's.

**The search, as request 07's:** the site's network (`b10c128-s46923648-d9407005`, the 16-bit model file), protocol
0.3's analysis settings, one search thread for each position, the query's default seed. Each position but the last,
searched once to 512 visits and read at 256 and 512.

**For each position,** one JSON line in request 09's shape: `game`, `index`, `mover`, `played` (the site's notation),
`turnStart` and `edgesLeft`, the `engine` tag, and for each budget the root's `visits`, `winrate`, `scoreLead`,
`scoreSelfplay` and `scoreStdev`, and the candidates `first`, `second` and `played`. In `facts`: the two players
(`blue`, `red`), their ladder ratings, the final scores, the winner, and `openingPlies` (the seeded opening's length).

**Where:** under the engine repository's `runs/`, beside requests 07 to 09's files, with a note of the fields.

**The cost:** 384 games of up to 120 edges at 512 visits: about 24 million visits, about 40 minutes at part 1's speed.
It can run in the same pass as request 09.

## Why

The labels need a curve from the lead to the chance of winning: a turn that gives away 30 points matters when the
lead is 20 and much less when it is 120. Points alone do not tell these apart. The open question is the curve's
steepness: the engine's own win chance (perfect play), a practical chance fitted on the meaf.us archive (players of a
game two weeks old, so lenient, and it moves as they improve), or a curve fitted on weaker versions of the engine.

This repository tests each candidate measure on bot games of known strength. A measure is sound when its labels get
rarer smoothly as the bot gets stronger, the strongest players get few, the labels do not pile up in the opening or in
decided games, and the gap in accuracy between two players follows the gap in their ratings. The visit ladder gives
that ladder of strength with one network and nothing else changed. A curve fitted on these games, or on request 09's,
is a standard of a fallible but competent player, as Lichess fits its curve on players rated 2300 and above.

## Done when

- The file exists under `runs/`, with a note of its fields, the network, the build, the settings and the games.
- The engine repository tells this repository where the file is.

## Delivered

`ladder-384.jsonl` in the engine repository's `runs/archive_analysis/` (not in Git): 46,080 positions of 384 games of
the site's network against itself, from 16 against 32 visits to 512 against 1,024, 64 games a pair, read at 256 and
512 visits, in part 1's shape. The ladder's ratings are copied as `gpu-ladder-ratings-2026-10-10T15-18-18.json`: 744
at 16 visits up to 1,547 at 1,024. The same checks as request 09's.

**With it, the engine repository measured the lead** (its `v2/docs/decisions/komi.md`):

- **The lead is the even komi.** 1,000 positions of part 1, searched again at 512 visits with the side behind given
  the lead as komi: for leads up to 500 points the side ahead's win chance comes to 0.49 to 0.51, at every stage. Above
  500 points, before the last 30 edges, the network reads such a komi short (the side ahead still wins 75 to 88%).
- **The lead is nearly the score:** `scoreSelfplay` is 1.16 times the lead in the first 20 edges, 1.00 at the end, 1.02
  in even positions. A move's points lost by the lead and by the score correlate at r = 0.995, a median of 6 points
  apart against a median loss of 38. At point thresholds from 12 to 120 they disagree on 3 to 6% of moves.
- **It predicts the result** (the area under the ROC curve on part 1): the win chance 0.887, the lead 0.875, the lead
  over `scoreStdev` 0.886.
- **It moves little with more search:** from 256 to 1,024 visits the lead changes no more than the win chance does,
  relative to its range, in edges 0 to 90, and about twice as much in the last 30 edges. Its mean change: 17.5 points.

**Checked here:** the label rules tested on these games (decisions/engine.md, "The label rules on games of known
strength").
