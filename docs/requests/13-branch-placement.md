# The notation: where a branch goes, and the marks of a move's quality

**Status:** done, checked here. **Asked:** 2026-10-12. **Delivered:** 2026-10-12.

## What

### 1. One rule for where a branch goes

The game record notation's branches (the engine repository's `docs/design/04-notation-and-protocol.md`, the site's
`/notation` page) have two examples that place a branch in two ways:

- **At a turn's start,** the site's page writes the branch after the turn it replaces, as PGN writes a variation after
  the move it replaces: `3. D10-G9 G9-H10 (3. D10-F13 F13-G10) 4. …`. The design gives this form without a place:
  `(4. N9-Q11 M12-N9)`.
- **At a turn's second edge,** the design writes the branch before the edge it replaces: `4. N9-Q10 (4... M12-N9)
  L10-N9`, "at turn 4, after N9-Q10, M12-N9 instead of L10-N9". PGN would write `4. N9-Q10 L10-N9 (4... M12-N9)`.

Please decide one rule for where a branch goes, and write it in the design:

1. **PGN's rule:** a branch follows the move or the turn it replaces. The second example becomes `4. N9-Q10 L10-N9
   (4... M12-N9)`.
2. **At the point where it leaves the line:** a branch comes right after the last move it shares with the line. The
   first example becomes `2. … (3. D10-F13 F13-G10) 3. D10-G9 G9-H10`.
3. **As the two examples are now:** after a turn it replaces at the turn's start, before an edge it replaces at the
   second edge. Then the design says so, with both cases.

### 2. Marks of a move's quality

Lichess's PGN export writes a move's quality twice: a mark after the move (`?!`, `?`, `??`, PGN's suffix annotations)
and a comment ("Mistake. Nf3 was best."). The notation has comments and `%` commands, but no marks. The site's
annotated record therefore writes its labels in comments only: `3. D10-G9 G9-H10 { [%eval 0.410 -12.0 180.0]
Mistake. D10-F13 F13-G10 was best. }`.

Please decide whether the notation has marks of a move's quality, and if so:

1. **Which marks:** PGN's six (`!!`, `!`, `!?`, `?!`, `?`, `??`), or a subset. The site's labels that have a mark in
   Lichess's export: Inaccuracy `?!`, Mistake `?`, Blunder `??`. The site's Great would be `!`.
2. **Where a turn's mark goes:** a turn of two edges is one decision. After the turn's last edge (`3. D10-G9 G9-H10?`),
   or after the edge that lost (`3. D10-G9? G9-H10`), or either, as the writer judges by turn or by edge.
3. **With the cut mark:** after it, as SAN writes `Nxe5?`: `D10-G10x?`.
4. **How a reader treats them:** accepts them and may ignore them, as it ignores comments. The site's reader then
   accepts them too.

Without marks, a reader that wants the labels must read English words in the comments.

### 3. A comment before the first turn

The annotated record starts with a note: `{ Reviewed by Hedge School with the network …, at least 1024 visits a
position. } 1. A7-D10 …`. PGN allows a comment before the first move. Please confirm that the notation does too, or
say where such a note goes (a tag such as `[Annotator "…"]`, as PGN's).

## Why

The site exports a reviewed game as an annotated record, with the player's own lines as branches and the labels as
comments (this repository's `docs/design/13-export-import.md`). Another program needs one rule to know which move a
branch replaces, and a fixed form to read the labels. The export now follows the two branch examples as they are
(the third rule), writes no marks, and starts with a note. The site's own reader skips branches and comments, so
the site works whatever the engine repository decides.

## Done when

- The design states the branch rule, the marks (or that there are none), and where a note before the first turn
  goes. The engine repository tells this repository.
- The site's `/notation` page, its export and its reader follow them.

## Delivered

The engine repository decided all three points in its `docs/design/04-notation-and-protocol.md`:

1. **Branches:** a branch follows the turn it changes, after the turn's last edge, its mark and its comments. Its
   first number tells where it leaves the line. `N.` starts at the turn's start and replaces the whole turn:
   `3. D10-G9 G9-H10 (3. D10-F13 F13-G10)`. `N...` starts at the turn's second edge and shares its first edge:
   `4. N9-Q10 L10-N9 (4... M12-N9)`. Several branches of one turn follow it one after another. A branch's first
   number always equals the number of the turn before it, so a reader can check it.
2. **Marks:** the notation has PGN's six suffix marks: `!!` brilliant, `!` good, `!?` interesting, `?!` dubious, `?`
   mistake, `??` blunder. A mark judges a turn, once, right after the turn's last edge (or its pass), after any cut
   mark, and before the comments and branches: `3. D10-G9 G9-H10? { Mistake. D10-F13 F13-G10 was best. }`,
   `G9-G12x??`. A judgement of a single edge stays in a comment. For the site's labels: Great `!`, Inaccuracy `?!`,
   Mistake `?`, Blunder `??`. Best, Excellent and Good get no mark. `!!` stays free for a Brilliant label, and `!?`
   for an "interesting" label or the players' own notes. Writers mark only after a turn's last edge. Readers accept a
   mark after any edge and may ignore it. Numeric NAGs (`$1`) are not part of the notation, and protocol moves take no
   marks.
3. **A note before the first turn:** allowed, after the tags, as PGN allows. A new optional tag, `[Annotator "…"]`,
   names who annotated the game.

**Checked here:** the export writes branches after their turn, the marks by turn, the note, and
`[Annotator "Hedge School"]`. The reader drops a mark after any edge, a pass or a cut mark (tests in
`src/lib/game/record.test.ts` and `src/lib/review/annotate.test.ts`). The `/notation` page describes the branch
rule, the marks, the note and the tag.
