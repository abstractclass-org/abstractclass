# The record's `Komi` tag

**Status:** open. **Asked:** 2026-11-06.

## What

The game record notation (the engine repository's `docs/design/04-notation-and-protocol.md`, "A game record") gets a
tag for the komi:

- **`[Komi "K"]`:** the komi as the engine counts it, a starting score: K points added to Red's final score (KataGo's
  White), and below 0 to Blue's. A whole or half number, as KataGo's `komi` command takes it, with its sign: `300`,
  `-300`, `7.5`.
- **No tag is komi 0,** and so are PGN's `?` and `-`. Every record before the tag reads as it did.
- **The result counts the komi:** `r+120` when Red won by 120 points with its komi. The `Scores` tag keeps the rules'
  scores, with no komi.
- **A reader refuses a `Komi` tag that is not such a number,** at the tag, as it refuses a wrong turn number: no
  reader reviews a game at a komi that it did not read.

The same tag in Blueprints' record (Cyanotype's design 33), whose komi is also added to Red's final margin
(games/blueprints/README.md, "Komi").

## Why

- **Practice's komi** (this repository's design 24): the owner asked for a komi in Practice (2026-11-06), and a game
  played at a komi must keep it in its record, so that its review searches at the komi (the protocol's query field
  `komi`), and its result reads right.
- **The site gives the tag now:** the notation page (`apps/hedgeschool/src/routes/notation/+page.svelte`, and
  Cyanotype's) describes it, and Practice writes it. The notation's rule is that a change is decided in design 04
  first (design 11, item 8), so this request asks the engine repository to record it there, or to change it.
- **Why a tag and not a comment:** a komi changes every value of the game, as a `Position` tag does. SGF keeps it in a
  property of the root (`KM`), and PGN keeps a start in a tag (`FEN`).

## Done when

- The engine repository's design 04 has the `Komi` tag, in this form or another. Another form changes the site's
  reader and writer (`packages/record/src/record.ts`, `komiOf`, `komiTag`) and the notation pages.
- A tool of the engine repository that reads records (the archive's, the arena's) takes the tag, or refuses a record
  with it.
