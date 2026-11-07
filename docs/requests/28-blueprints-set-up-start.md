# Blueprints: the practice bot from a set-up start, and a position's check

**Status:** open (the engine repository's abscls-0dh7). **Asked:** 2026-11-07.

## What

Cyanotype, Blueprints' site, has everything that Hedge School has. Its board editor and its starts from a set-up
position are built (abscls-8tl1.39: design 33, item 10 of "Decision" and "The board editor"). The analysis module of
`engine-91ab0b7d` takes a set-up start: a query's position, in the engine's one-line form. Two things that Enclosure's
release has are missing:

1. **The practice bot from a set-up start,** as request 20 gave Enclosure's bot `enclosure-set-position`: a GTP command
   that starts a new game from a position in the engine's one-line form, as the analysis module's queries take it.
   Then `play`, `genmove` and `undo` work from that start, and `undo` stops at the start. In both practice modules,
   the one-thread bot and the threaded bot. The bot now has `blueprints-set-game [MOVE ...]`, which starts from the
   standard start only (the engine repository's `games/blueprints/README.md`, the practice bot's commands).
2. **A position's check,** as request 16 gave Enclosure's (protocol 0.5): whether a game of Blueprints' rules can
   reach a position, and if not, each reason in words that a player reads. The rules decide what "can reach" means.
   Cyanotype asks only for what a game makes certain: a position that a game reaches only in a rare way still passes.
   If Blueprints' rules make no useful check possible, the engine repository's design says so, with the reason.
   The bot of item 1 refuses a position that the check refuses, with the check's first reason (`? ...`), as
   Enclosure's does.

The site gives each position in the engine's form as it does for the analysis queries (design 33, item 10): the middle
of the cells' box as the offset, no pick of an edit and no boxes of earlier placements.

## Why

- **Practice from a position** (design 24, item 4; abscls-8tl1.40): the Analysis board's "Play the bot from here"
  starts a practice game at the position on screen, and Practice takes a set-up start. A board from the board editor,
  or from a record with a `Position` tag, has a set-up start. `blueprints-set-game` can replay only a game from the
  standard start.
- **The board editor** (design 21; design 33, "The board editor"): Hedge School's editor says whether a game can
  reach the position, and gives the engine's reasons when no game reaches it. Cyanotype's editor says that the engine
  does not check this.
- **Cyanotype's release** waits for both (abscls-8tl1.20).

## Done when

- The engine repository documents the command and the check (`games/blueprints/README.md`, the protocol and the
  practice bot's commands), and a release of `abstractclass-org/blueprints-engine` has them, with the versions of the
  protocol and of the bot's interface raised as the engine repository's rules give.
- If the release can keep the search of `engine-91ab0b7d` and its network (Stamp Duty 0.2), it says so (request 17,
  "The same search"): Cyanotype's stored results then stay.
- Cyanotype then checks, from set-up starts of the board editor and of Stamp Duty's own games, that each of the bot's
  moves is legal by the analysis module, that `undo` stops at the start, and that the bot takes a start exactly when
  the check finds it reachable.
