# The archive analysed for the labels: every position at the site's budgets

**Status:** accepted for a sample of 1,000 games: the whole archive would take 12 to 16 hours of the GPU. About
119,000 positions, enough for the percentiles of points lost by rating band if the games spread over the bands.
**Changed on 2026-10-11,** before the sample's run: the site labels turns by default, and edges on a setting. Two parts
are added: the lines at a turn's start, and a Great follow-up by turn beside the one by edge (below, "The change for
labels by turn").

## The change for labels by turn

The site now gives its label to a turn by default, and to each edge on a setting (this repository's
`decisions/product.md`, "Labels by turn" and "Judged by turn or by edge"). A turn's loss is the mover's value at the
turn's start less the mover's value after its last edge. The values of every position give both losses, so the
searches at the three budgets do not change, and one run serves the fit of both. Two parts are added:

- **The lines at a turn's start:** the first three candidates, each with the first two edges of its line. With them the
  site finds the turn that the engine thinks best. Three are enough: the first two can be one turn in its two orders.
- **The Great follow-up by turn,** beside the follow-up by edge, which stays ("For Great, by edge" and "For Great, by
  turn", below). Most of their searches are the same: at a turn's second edge they are one search. A search that both
  ask for runs once.

If the run has started, the follow-up by turn can run after it as a second pass over the same positions.

## What

Analyse the positions of the meaf.us archive (the engine repository's `runs/archive/games.jsonl`, 7,138 games now)
with the site's network and search settings, on the engine repository's GPU, and give this repository the values that
its labels read. In two parts:

1. **Every game, at the review's budgets.** Each position of each game that the engine accepts (not the final
   position: the protocol refuses it), searched once to 1,024 visits and read after each slice of 256, so that one
   search gives 256 visits (the least for a label), 512 (the review's Lite depth) and 1,024 (Standard). The result
   after a slice equals a fresh search of that many visits (the engine repository's check, and this repository's under
   protocol 0.3).
2. **A deeper reference on a sample.** About 100 games, spread over the rating bands, searched to 4,096 visits and
   read after 256, 512, 1,024, 2,048 and 4,096. This measures how far the review's budgets stand from a deeper search
   (this repository's `decisions/engine.md`, "Label agreement against search budget, under protocol 0.3", used 1,024
   as its reference).

**The search, as the site's:**

- The network the site uses: `b10c128-s46923648-d9407005`. If the site takes a newer model (its backlog, "A newer
  model"), the fit is made again on that one.
- The protocol's analysis settings (protocol 0.3: root noise on, no moves before the root), with no
  `overrideSettings`.
- One search thread for each position, and many positions at once (`numAnalysisThreads` large,
  `numSearchThreadsPerAnalysisThread = 1`, KataGo's advice for many positions). The site's module searches on one
  thread, so the search is the same algorithm. The native build's outputs equal the WebAssembly build's to rounding
  (`v2/docs/decisions/build.md`).

**For each position,** one JSON line, in the shape of this repository's `scripts/measure/budget-collect.mjs` output, so
that its summary scripts read it:

- **The position:** the game (an index or the game's id), the position's index, the mover, and the edge played next
  (the engine's notation).
- **The game's facts:** both players' ratings (`enclosure.arena.prior_ratings` on the archive), the final scores, the
  reason the game ended, and the time control. No player names: the ratings are enough to group the games.
- **For each budget:** the root's visits, `winrate`, `scoreLead`, `scoreSelfplay` and `scoreStdev`. The first and
  the second candidates (move, visits, `winrate`, `scoreLead`, `scoreSelfplay`). The played edge's candidate when
  the search visited it.
- **At a turn's first position, for each budget, also:** the first three candidates in the engine's order (move,
  visits, `winrate`, `scoreLead`, `scoreSelfplay`), each with the first two edges of its line (`pv`) and their
  `pvVisits` and `pvEdgeVisits`.
- **For Great, by edge** (at 512 visits): where the played edge is the first choice and the second looks at least 0.10
  of win chance worse for the mover, the root values of the position after the second choice, searched to 512 visits.
  The edge is Great when that value is at least 0.10 of win chance below the value of the position after the played
  edge.
- **For Great, by turn** (at 512 visits). The played turn is the engine's best turn when each of its edges is the
  first choice of its position's search, or when it reaches the same position as the first candidate's line after
  two edges (the same two edges in the other order). Where the played turn is the best turn, give the root values of
  each search that follows:
  - **From the turn's start:** take the first candidate that is not an edge of the played turn. When it looks at
    least 0.10 of win chance worse for the mover than the first choice, search the position after it to 512 visits.
    That position's value is the value of the best turn that starts with this candidate.
  - **From the turn's middle,** for a turn of two edges: at the position after the played first edge, when the
    played second edge is the first choice and the second choice looks at least 0.10 of win chance worse for the
    mover, search the position after the second choice to 512 visits. This is the follow-up by edge at the turn's
    second edge.
  - The turn is Great when each gap shows in its own search, and each follow-up's value is at least 0.10 of win chance
    below the value of the position after the played turn. The game's last turn gets no follow-up: the protocol
    refuses the final position. The site confirms Great so (its design 05).

**Where:** under the engine repository's `runs/`, out of Git. This repository reads the file from there on the
owner's machine. It commits only statistics over many games and the thresholds fitted from them, never a game.

If the engine repository has a better way to give the same values (another format, its own summary first), the site
follows it.

## Why

The site's labels use placeholder thresholds: chess.com's bands of win chance and KaTrain's bands of Go points times
the fork's score scale (`src/lib/review/labels.ts`). Design 01's principle 3 asks for thresholds fitted on Enclosure
games: the percentiles of points lost that separate strong players' turns from weak players', and the same for
edges, for the site's labels by edge. Checks on two reviewed
games show why it matters: a game decided early flags 44 of its 120 edges, most of them from points lost after the win
chance has saturated (this repository's `decisions/product.md`, "Label checks under protocol 0.3"). The same data
serves the rest of the milestone (design 01, section 4):

- The check that points lost falls with rating. If it does not, the measure is wrong.
- Which score measures points lost better, the lead or the margin (the backlog).
- The win chance per rating band (principle 2), and the labels' agreement with a deeper search (part 2).

A review of one game takes minutes on a visitor's machine. The archive has about 850,000 positions, so it needs the
GPU: about 870 million visits for part 1 (1,024 a position), and about 50 million for part 2. The engine repository
chooses when, for example at a planned stop of its training.

## Done when

- The two files exist under `runs/`, with a short note of their fields, the network, the build and the settings.
- Checked against the site's module on this repository's four measured ladder games
  (`runs/measure/budget-b10c128-p03.jsonl`, 480 positions at 256, 512 and 1,024 visits): the note gives the share of
  positions with the same first move, and the mean difference of the root's win chance and lead, at each budget.
  They tell whether the native data stands for the site's search.
- This repository has been told where the files are.
