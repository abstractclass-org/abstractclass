# Design documents

Each document explains one decision that is still in force: the context, the decision, why, the alternatives, the
consequences, where it is in the code, and links to the log entries. The decision logs
([../decisions/](../decisions/README.md)) are the archive.

Engine, rules, fork and protocol decisions are in the engine repository's design documents
([`docs/design/`](https://github.com/seankao31/enclosure-ai/blob/main/docs/design/README.md) and
[`v2/docs/design/`](https://github.com/seankao31/enclosure-ai/blob/main/v2/docs/design/README.md)). This folder holds
product decisions.

| # | Document | In short |
|---|---|---|
| 01 | [A game analysis tool for human players](01-analysis-tool.md) | What the tool does and why, from Lichess, KaTrain, Maia, KataGo and papers: points lost, fitted thresholds, difficulty, a human model, puzzles, tags, distilled rules, concepts. |
| 02 | [A static site, with the analysis on the player's CPU](02-static-site.md) | Static files. The engine as versioned artifacts from the engine repository. One module instance per Web Worker. Heavy work offline on the GPU. An engine interface of our own design. |
| 03 | [The stack](03-stack.md) | TypeScript, SvelteKit (static), Vite, Cloudflare. Engine artifacts pinned by SHA-256: releases for deploys, local builds for development. |
| 04 | [The product's shape](04-product-shape.md) | Static now, a server later. Explanations from templates over engine facts. Desktop first, phone usable. Plain and clear, with a few rewards. |

To add a document: give it the next number, use the same sections, and link it here. When a decision is replaced,
mark the old document "Status: replaced by NN" instead of deleting it.
