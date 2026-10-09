# The product's shape: storage, explanations, devices and look

**Status:** in force. **Decided:** 2026-10-09.

## Context

The survey of chess and Go tools ([research/01-ux-survey.md](../research/01-ux-survey.md)) showed four choices that
shape the rest of the interface: where a player's data lives, whether the review explains in words, which devices
come first, and the look. The site is static, and the engine runs in the visitor's browser
([02-static-site.md](02-static-site.md)).

## Decision

1. **Static now, a server later.** A player's history (reviews, puzzle attempts, lesson progress) lives in the
   browser's storage. Its data is designed so that a small server (accounts, puzzle attempts from many solvers) can
   be added later without rework. Until then, puzzle difficulty is predicted, not rated from attempts.
2. **Explanations from templates over engine facts.** The guided review writes short sentences built only from
   checked facts: labels, points lost, the better edge, its line, and tags. No free-form text from a language model.
3. **Desktop first, phone usable.** The design aims at a wide screen. On a phone the columns stack, and reading a
   review and solving puzzles work. Fine analysis by touch is not a goal for the phone at first.
4. **Plain and clear, with a few rewards.** A study tool in the manner of Lichess, with small rewards (streaks,
   progress) in puzzles and lessons. No characters or celebrations.

## Why

1. **Storage:** a server costs money and needs operation, and nothing in the first milestone needs it. Designing for
   it now keeps the later step small. Lichess's dashboard and "from my games" work from stored history, and the
   browser can hold one player's history.
2. **Explanations:** a language model without tools gets about a fifth of its chess claims wrong (Hebbar et al., in
   [design 01](01-analysis-tool.md), principle 11). Text from facts is always correct. Lichess writes such text
   ("Inaccuracy. e6 was best.") in its move list.
3. **Devices:** an edge is chosen between lattice points, which needs precise input. Reviews are often done at a desk.
   A phone layout that stacks the columns, as Lichess's does, still serves reading and puzzles.
4. **Look:** the audience includes top players, who want information, not decoration. Small rewards keep learners
   coming back (Lichess's streaks and progress map in Learn).

## Alternatives

- **Static forever:** the cheapest, but puzzle ratings stay predicted and history stays on one device.
- **A server from the start:** real puzzle ratings sooner, at a cost before the product has players.
- **No text at first:** less work, but the guided review loses its main help for learners.
- **A language model with the engine as a tool:** richer text, but a cost for each review, a server or an API, and
  errors to check.
- **Phone and desktop alike:** more reach, but much more design work for entering edges by touch.
- **Friendly and game-like (chess.com):** good for beginners and retention, but it can put off strong players.

## Consequences

- Stored data has a version and an export, so that a later server can import it.
- Puzzles need a predicted difficulty until a server collects attempts.
- The explanation templates need the tags and the label rules first. Text grows as tags are added.
- Layouts are designed at desktop width first, then checked at phone width.

## Log entries

- [decisions/product.md](../decisions/product.md), "The product's shape" (2026-10-09).
