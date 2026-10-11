# Requests to the engine repository

This repository does not change the engine repository ([enclosure-ai](https://github.com/seankao31/enclosure-ai)).
When it needs a change there, it writes a request here. The engine repository's session reads the request, decides,
and records its decision in its own documents. A request stays here as the record of what this repository asked for
and why.

Each request gives what is needed, why, and how to check that it is done. Mark its status when it changes: open,
accepted, done (with the engine repository's commit, tag or document), or declined (with the reason).

| # | Request | Status |
|---|---|---|
| 01 | [A pointer to the moved design document](01-design-pointer.md) | done (engine repository commit `fb5b28e`) |
| 02 | [What the product needs from the engine protocol](02-engine-protocol.md) | done (protocol 0.1, reported as 1.0 by module build `8195171`) |
| 03 | [Releases of the engine builds that the site deploys](03-release-artifacts.md) | accepted, for the first deploy |
| 04 | [Document `edgeVisits` and `order` in the engine protocol](04-edge-visits-and-order.md) | done (engine repository commit `1a377d3`) |
| 05 | [The visits behind each move of a line: KataGo's `includePVVisits`](05-pv-visits.md) | done (engine repository commit `0886496`, no protocol change) |
| 06 | [The network's evaluations on the visitor's GPU: WebGPU](06-webgpu.md) | step 1 measured: on the RTX 5080 batches gain 6 to 27 times, one position at a time little; on an Apple laptop one position gains 2 to 4 times; step 2 not decided, the site's answer on batching sent |
| 07 | [The archive analysed for the labels: every position at the site's budgets](07-archive-analysis.md) | done for a sample of 1,000 games (the engine repository's `runs/archive_analysis/`, out of Git), checked here |
| 08 | [The archive's positions at a first look: the network's prior, 32 visits, and every candidate at 512](08-archive-first-look.md) | open: told to the engine repository |
| 09 | [Bot games analysed for the win curve: the V2 gauntlet's middle](09-bot-games-analysis.md) | open: to tell the engine repository |
