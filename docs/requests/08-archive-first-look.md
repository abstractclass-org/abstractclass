# The archive's positions at a first look: the network's prior, 32 visits, and every candidate at 512

**Status:** done on 2026-10-12, and checked here (below, "Delivered"). **Asked:** 2026-10-12.

## What

Read part 1 of request 07 again ([07-archive-analysis.md](07-archive-analysis.md), "Delivered": the 1,000 games of
`runs/archive_analysis/part1-1000.jsonl`) for three things that its file does not hold. The abandoned games (89) can
be left out: this repository does not use them.

1. **The network's prior,** at each position: the prior of every legal edge (the protocol's `includePolicy`, a list
   sorted by prior), or at least the first 32 and the played edge's.
2. **A search of 32 visits,** at each position: the root's `visits`, `winrate`, `scoreLead`, `scoreSelfplay` and
   `scoreStdev`, and the candidates `first`, `second` and `played` with the fields of request 07. This is the review's
   first sweep (design 05: 32 visits for every position before the label pass).
3. **Every candidate at 512 visits,** at each position: for each candidate that the search visited, `move`, `visits`,
   `prior`, `winrate`, `scoreLead` and `scoreSelfplay`, in the engine's order. Request 07 kept only the first, the
   second and the played edge's.

**The search, as request 07's:** the same network (`b10c128-s46923648-d9407005`, the site's 16-bit model file), the
protocol's analysis settings (protocol 0.3, root noise on, no moves before the root, no `overrideSettings`), one
search thread for each position, and the same query seed. Then the search at 512 visits is request 07's search, and its
root values match part 1's reading at 512 up to the GPU's rounding.

**For each position,** one JSON line with `game` and `index` as in part 1, so that the two files join on them, and the
three readings above. The engine tag as in request 07.

**Where:** under the engine repository's `runs/archive_analysis/`, out of Git, beside part 1, with a note of the
fields. This repository commits only statistics over many games, never a game.

**The cost:** about 84,000 positions. The search at 512 visits is about 43 million visits, about 70 minutes at part 1's
speed (about 10,100 visits a second). The prior and the 32 visits add little. The engine repository chooses when.

## Delivered

`runs/archive_analysis/part1-1000.jsonl.first-look.jsonl` in the engine repository (1.27 GB, out of Git). Its note,
`README.md` there, section "The first look", gives every field.

- **The positions:** all 79,200 positions of part 1's 911 games that were not abandoned. The lines join part 1 on
  `game` and `index`.
- **Two fresh searches per position,** with request 07's settings and seed: 32 visits with the policy, then 512 visits.
- `policy`: every legal edge with its prior, sorted by prior (20 to 1,183 edges, median 424). A timeout's pass is not
  an edge, so it has no prior (1,733 positions).
- `raw`: the network's own values at the position, without search (`rawWinrate`, `rawLead`, `rawScoreSelfplay`,
  `rawScoreSelfplayStdev` and the network's error estimates).
- `budgets."32"`: the root's values and the candidates `first`, `second` and `played`, with request 07's fields.
- `budgets."512"`: the root's values and every candidate that the search visited, in the engine's order (1 to 284,
  median 18), each with `move`, `visits`, `edgeVisits`, `prior`, `winrate`, `scoreLead` and `scoreSelfplay`. A move's
  share of the search is its `edgeVisits`.

**The engine repository's check against part 1 at 512 visits:** the same first candidate in 79,183 of 79,200
positions. The root's win chance is identical in 66,271 and differs by more than 0.01 in 9 (at most 0.10, mean
0.000006): the GPU's rounding, as in request 07. In most of the 17 positions with another first candidate, the two
first candidates were nearly equal. A candidate's `prior` and its entry in `policy` come from the two searches'
separate evaluations, so they can differ by up to 0.000005.

**Points to know:**

- **KaTrain's complexity needs its constants scaled.** Its `game_report` caps the complexity at 1 and weighs each move
  by `points_lost / 4`, both in Go points. On this engine's scale, 12 times Go's as for the label bands, the cap is 12
  points and the term is `points_lost / 48`. The median loss of a played edge that is not the first choice is 38
  points: without the scaling, nearly every position would have the highest complexity.
- The engine repository sends how good the lead (`scoreLead`) is, against the score and the win chance, with request
  09's message, with a test of what the lead means.

**Checked here:** 79,200 positions of 911 games, no error, no position twice, every field above present. Every line
joins part 1, and they are exactly part 1's positions outside the 89 abandoned games. The first candidate at 512
equals part 1's in 79,183.

## Why

The review is to show how hard a position was to play, beside the move's label (design 01, principle 4: "position
difficulty is a first-class quantity"). Two published measures need the readings above. This repository checks them
on the archive's human games before the site shows either.

- **KaTrain's complexity** (its `game_report` in `katrain/core/ai.py`): the points that a move drawn from the network's
  prior would lose, over the candidates that the search visited. It needs every candidate's prior and points at one
  budget: the third reading.
- **Guid and Bratko's complexity** ("Computer analysis of world chess champions", 2006): the sum of the gaps between
  the first and second choices, at each depth where the first choice changes. On request 07's readings (256, 512 and
  1,024 visits), a change of the first choice halved how often players found the engine's first choice, but it barely
  changed how often they lost 0.10 of win chance or more (this repository's `decisions/engine.md`, "Guid and Bratko's
  complexity on the archive"). Guid and Bratko start at depth 2. A player's first look is nearer the network's prior
  and a short search than a search of 256 visits: the first and second readings.

Each is checked the same way: whether human players lose more where the measure is high, by rating band, at the same
stake. The site can compute both from a review's own searches: it has the prior of each candidate and the 32-visit
sweep.

## Done when

- The file exists under `runs/archive_analysis/`, with a note of its fields, the network, the build and the settings.
- The note says that the search at 512 visits matches part 1's reading at 512 (the share of positions with the same
  first candidate, and the mean difference of the root's win chance).
- This repository has been told where the file is.
