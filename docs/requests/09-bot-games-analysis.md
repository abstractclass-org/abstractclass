# Bot games analysed for the win curve: the V2 gauntlet's middle

**Status:** done on 2026-10-12, and checked here (below, "Delivered"). **Asked:** 2026-10-12.

**Noted by the engine repository:** 440 of the 620 games have a player that is an earlier checkpoint of b10c128, from
the same training run as the site's network. Such a player may agree with the site's network more than an unrelated bot
of the same rating would. The bot names are in each game's facts, so this repository fits the curve on all 620 games
and on the 180 without such a player, and compares the two.

## What

Analyse some games of the V2 gauntlet (the engine repository's `runs/v2a-gauntlet/arena/games.jsonl`) as request 07
analysed the archive ([07-archive-analysis.md](07-archive-analysis.md)), with the site's network, so that this
repository can fit its win curve on bot games beside human ones.

**The games:** those whose two players are both rated from 2,000 to 3,000 in the gauntlet's ratings
(`runs/v2a-gauntlet/arena/ratings.json`, updated 2026-10-12T02:30:22) and at most 300 apart. On that file there are 620
such games, all at 128 visits a move. If the engine repository has a better rule for "strong, but well below the
analysing network", the site follows it.

- The low end is net1's and net1b's last models (gnn:net1:370 at 2,018, gnn:net1b:450 at 2,043).
- The high end stays below the site's network at 128 visits (b10c128-s46923648-d9407005 at 3,111), and further below
  its search of 512 visits, so that the players do not merely agree with the network that judges them.

**The search, as request 07's:** the site's network (`b10c128-s46923648-d9407005`, the 16-bit model file), protocol
0.3's analysis settings, one search thread for each position, the query's default seed. Each position but the last,
searched once to 512 visits and read at 256 and 512.

**For each position,** one JSON line in request 07's shape: `game` (an id that is stable, such as the line's number in
`games.jsonl`), `index`, `mover`, `played` (the site's notation), `turnStart` and `edgesLeft`, the `engine` tag, and for
each budget the root's `visits`, `winrate`, `scoreLead`, `scoreSelfplay` and `scoreStdev`, and the candidates `first`,
`second` and `played`. In `facts`: the two players' names (bot names: `blue`, `red`), their gauntlet ratings, the final
scores, the winner (from `returns`), and `openingPlies` (the seeded opening's length: those moves were not chosen by the
players).

**Where:** under the engine repository's `runs/`, beside request 07's files, with a note of the fields.

**The cost:** about 620 games of up to 120 edges at 512 visits: about 38 million visits, about an hour at part 1's speed
(about 10,100 visits a second). It can run in the same pass as request 08
([08-archive-first-look.md](08-archive-first-look.md)).

## Why

The labels are to use a win chance fitted on human games: σ(k · lead / scoreStdev), with the lead and the spread from
the site's network (this repository's `decisions/engine.md`, "The human win curve fitted on the archive"). k is about
1.04 on the archive's games of every rating, and 1.12 on its games at 1800 and above, but only 233 games are that
strong. Lichess fits its curve on strong players' games (2300 and above, lila pull request 11148).

Bot games give many games at a known, controlled strength. Fitted on them, the curve shows whether k keeps rising with
the players' strength (the gauntlet's 2,000 to 2,500 against 2,500 to 3,000), and where bot games stand against the
archive's bands. Whether the site's curve may come from bot games is decided here after that comparison: bots err
unlike humans (McIlroy-Young et al., "Aligning superhuman AI with human behavior: chess as a model system", 2020), so
the human fit stays the reference.

## Done when

- The file exists under `runs/`, with a note of its fields, the network, the build, the settings and the rule that
  chose the games.
- The engine repository tells this repository where the file is.

## Delivered

`gauntlet-620.jsonl` in the engine repository's `runs/archive_analysis/` (not in Git. Its `README.md`, "The bot
games", gives every field): 74,400 positions of 620 gauntlet games, read at 256 and 512 visits, in part 1's shape with
`top3` at each turn's start. Both players rated 2,000 to 3,000 and at most 300 apart, in the gauntlet's ratings of
2026-10-12T02:30:22 (copied beside the output: the gauntlet rewrites its file each round). 37 players, all at 128
visits a move. The facts: the arena's names, ratings (the arena's own Elo scale), scores, winner, `openingPlies` (4 in
every game: those edges were drawn at random) and each player's visits. Checked there: every position once, no error,
both budgets at exactly their visits, one engine tag (request 07's), and replaying each game gives the arena's scores
and winners. 440 games have a player from the site's network's own run (`kg:v2a:b10c128-…`, up to s41421696).

**Checked here:** the label rules tested on these games (decisions/engine.md, "The label rules on games of known
strength").
