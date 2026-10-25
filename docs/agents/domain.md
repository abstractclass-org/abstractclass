# Domain docs

How the engineering skills read this repository's domain documentation. Layout: the glossaries are in the planning
repository, one copy for the sites and the engines.

## Before exploring, read these

- **The glossaries,** in the planning repository: the folder that holds this repository's checkout,
  `F:/Users/user/Projects/abstractclass-org` on this machine (`../` from this repository's root).
  - `GLOSSARY.md`: the terms that every game, site and engine shares. Its "Contexts" list links to each game's
    glossary.
  - `glossary/<game>.md`: the game's own terms (its official words), what its site shows, and its engine's own
    words. Read the one of the game you work on: `blueprints.md` for Drawing Board, `enclosure.md` for Hedge School.
- **The design documents** in `docs/design/` (`NN-topic.md`, one for each decision still in force, listed in
  `docs/design/README.md`). They are this repository's decision records (ADRs). Read the ones that touch the area
  you are about to work in.
- **The decision log** in `docs/decisions/`: the archive, by topic, of what was decided and measured. Read it for the
  history of a decision. The design documents give the decision as it is now.

If a file does not exist, proceed silently. Do not flag its absence, and do not suggest creating it in advance. The
`/domain-modeling` skill (reached through `/grill-with-docs` and `/improve-codebase-architecture`) creates a game's
glossary when its first term is settled, and adds it to the shared glossary's "Contexts".

## Where new records go

- Where a skill says "ADR", write a design document: a new one in `docs/design/` with the next free number and a line
  in `docs/design/README.md`, or an update to the one already in force. This repository keeps its decision records in
  `docs/design/` only.
- A settled term goes into a glossary in the planning repository: a term that every game shares into its
  `GLOSSARY.md`, and a game's own term into `glossary/<game>.md`. A game's term is the word of the game's official
  rules and buttons, unless that word is really bad. The code takes the glossaries' words too, except in names that
  stored data holds. Commit a glossary's change in the planning repository.
- CLAUDE.md, "Writing documents", applies to both.

## File structure

```
/
├── docs/design/           ← decision records, one for each decision in force
├── docs/decisions/        ← the archive, by topic
├── packages/              ← the shared packages: engine, storage, analysis (design 29), record, site (design 33)
├── apps/hedgeschool/      ← Hedge School, Enclosure's site (design 26)
└── apps/drawingboard/     ← Drawing Board, Blueprints' site (design 33)

../                        ← the planning repository
├── GLOSSARY.md            ← the shared terms, and the list of the games' glossaries
└── glossary/              ← one glossary for each game: blueprints.md, enclosure.md
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the
term as defined in the glossaries (the shared one and the game's). Don't drift to synonyms that a glossary avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts with a design document

If your output contradicts a design document, say so explicitly rather than silently overriding it:

> _Contradicts design 26 (one repository for the learning sites), but worth reopening because…_
