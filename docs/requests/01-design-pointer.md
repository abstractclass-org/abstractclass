# A pointer to the moved design document

**Status:** done, in the engine repository's commit `fb5b28e`. Its `docs/analysis-tool-design.md` is now a pointer to
this repository. The pointer gives the path only, and gets this repository's web address when it is published.

## What

The design of the analysis tool moved from the engine repository to this repository:

- From: [`docs/analysis-tool-design.md`](https://github.com/abstractclass-org/enclosure-ai/blob/main/docs/analysis-tool-design.md)
  in the engine repository.
- To: [`docs/design/01-analysis-tool.md`](../design/01-analysis-tool.md) in this repository.

In the engine repository:

1. Replace the body of `docs/analysis-tool-design.md` with a pointer to the new place. Or delete the file.
2. Change the row of `analysis-tool-design.md` in `docs/README.md` to point to the new place.
3. Change any other link to the file (search for `analysis-tool-design`).

## Why

Product decisions live in this repository. Two copies of one design drift apart.

## Done when

No document in the engine repository holds a copy of the design. Each link to it reaches this repository's copy.
