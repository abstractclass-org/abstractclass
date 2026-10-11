# The archive's positions at a first look: the network's prior, 32 visits, and every candidate at 512

**Status:** open, told to the engine repository. **Asked:** 2026-10-12.

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
