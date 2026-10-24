# Domain docs

How the engineering skills read this repository's domain documentation. Layout: single-context.

## Before exploring, read these

- **`GLOSSARY.md`** at the repository root: the project's terms.
- **The design documents** in `docs/design/` (`NN-topic.md`, one for each decision still in force, listed in
  `docs/design/README.md`). They are this repository's decision records (ADRs). Read the ones that touch the area
  you are about to work in.
- **The decision log** in `docs/decisions/`: the archive, by topic, of what was decided and measured. Read it for the
  history of a decision. The design documents give the decision as it is now.

If a file does not exist, proceed silently. Do not flag its absence, and do not suggest creating it in advance. The
`/domain-modeling` skill (reached through `/grill-with-docs` and `/improve-codebase-architecture`) creates
`GLOSSARY.md` when the first term is settled.

## Where new records go

- Where a skill says "ADR", write a design document: a new one in `docs/design/` with the next free number and a line
  in `docs/design/README.md`, or an update to the one already in force. This repository keeps its decision records in
  `docs/design/` only.
- A settled term goes into `GLOSSARY.md` at the repository root.
- CLAUDE.md, "Writing documents", applies to both.

## File structure

```
/
├── GLOSSARY.md            (created when the first term is settled)
├── docs/design/           ← decision records, one for each decision in force
├── docs/decisions/        ← the archive, by topic
├── packages/              ← the shared packages: the engine, the storage, the analysis (design 29), the record (design 33)
└── apps/hedgeschool/      ← the site (design 26)
    └── src/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `GLOSSARY.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag conflicts with a design document

If your output contradicts a design document, say so explicitly rather than silently overriding it:

> _Contradicts design 26 (one repository for the learning sites), but worth reopening because…_
