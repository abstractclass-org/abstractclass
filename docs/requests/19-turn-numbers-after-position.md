# A record from a set-up start: the number of its first turn

**Status:** open. **Asked:** 2026-10-14.

## What

The notation (the engine repository's design 04, "A game record") does not say how a record numbers its turns when it
has a `[Position "..."]` tag. Hedge School asks the engine repository to say it, in design 04:

1. **The first turn's number:** the start's own turn, from its edge count, as the protocol numbers a position's turn
   (protocol 0.2). This is PGN's rule: moves after a `FEN` tag continue from the FEN's fullmove number.
2. **A start at a turn's second edge:** the record then opens with `N...`, as a branch does at the same place. PGN
   opens with `N...` when Black moves first after a FEN.
3. **Whether a reader also takes `1.`** for the first turn after a `Position` tag, for records that tools wrote before
   the rule.

## Why

- **The notation's turn numbers give the player:** Blue's turns are odd and Red's even. A record from a set-up start
  that is numbered from 1 loses this, because its first turn can be Red's.
- **Hedge School writes the start's own turn** in an annotated record from the Analysis board
  (`src/lib/review/annotate.ts`): `12... N9-Q10` at the second edge of turn 12, and branches with the same numbers.
  Its reader refused these records until now. It now takes the start's own turn, or `1.` (`src/lib/game/record.ts`,
  `parseRecord`), until the notation says which.
- **Another tool can write `1.`,** as nothing in design 04 rules it out. Then two records of the same game differ.

## Done when

- Design 04 gives the first turn's number after a `Position` tag, and says whether a reader also takes `1.`.
- Hedge School then makes its reader as strict as the rule.
