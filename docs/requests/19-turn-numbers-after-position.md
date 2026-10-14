# A record from a set-up start: the number of its first turn

**Status:** done: the engine repository's design 04, "The turns after a set-up start" (its commit `85f1792`), and
the reader here as strict. **Asked:** 2026-10-14.

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

## Delivered

The engine repository's design 04, "The turns after a set-up start", in its commit `85f1792`:

- **The first number** is the start's own turn, from its edge count: with e edges played, turn 1 when e is 0, else
  turn 1 + ⌈e / 2⌉. So 1 or 2 edges played is turn 2, and 119 is turn 61, Blue's last.
- **A start at a turn's second edge** (the mover `b1` or `r1` at an even edge count from 2 to 118) opens with `N...`,
  as a branch at the same place does.
- **A reader takes only this number,** and refuses a record that numbers its first turn otherwise, such as `1.` after
  a start that is not at turn 1. A reader that also took `1.` was considered and not taken: every reader would then
  map the numbers in two ways, and a record that names the wrong player would pass.

**Done here:**

- `parseRecord` (`src/lib/game/record.ts`) takes only the start's own number after a `Position` tag. Its error names
  the number expected, for example "turn 1. where turn 3. was expected".
- A start given apart from the record (the Analysis board's Import with its Position field, and the board's address
  with `position=`) is read as the record's own `Position` tag (`withStart`), so the same rule applies. A pasted
  record's error still gives its line and column in the pasted text.
- The tests that numbered from 1 after a set-up start now number from the start's turn (`partners.test.ts`), and
  `record.test.ts` checks the refusal and the start given apart. `npm test` passes (109).
