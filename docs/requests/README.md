# Requests to the engine repository

This repository does not change the engine repository
([engines](https://github.com/abstractclass-org/engines)). When it needs a change there, it writes a request
here. The engine repository's session reads the request, decides, and records its decision in its own documents. A
request stays here as the record of what this repository asked for and why.

Each request gives what is needed, why, and how to check that it is done. Mark its status when it changes: open,
accepted, done (with the engine repository's commit, tag or document), or declined (with the reason).

| # | Request | Status |
|---|---|---|
| 01 | [A pointer to the moved design document](01-design-pointer.md) | done (engine repository commit `fb5b28e`) |
| 02 | [What the product needs from the engine protocol](02-engine-protocol.md) | done (protocol 0.1, reported as 1.0 by module build `8195171`) |
| 03 | [Releases of the engine builds that the site deploys](03-release-artifacts.md) | done (the public releases repository `enclosure-engine`, release `wasm-v2-engine-85c2adb`), checked here |
| 04 | [Document `edgeVisits` and `order` in the engine protocol](04-edge-visits-and-order.md) | done (engine repository commit `1a377d3`) |
| 05 | [The visits behind each move of a line: KataGo's `includePVVisits`](05-pv-visits.md) | done (engine repository commit `0886496`, no protocol change) |
| 06 | [The network's evaluations on the visitor's GPU: WebGPU](06-webgpu.md) | done: the GPU module (release `wasm-v2-engine-06534ee`) built into the site, design 15 |
| 07 | [The archive analysed for the labels: every position at the site's budgets](07-archive-analysis.md) | done for a sample of 1,000 games (the engine repository's `runs/archive_analysis/`, out of Git), checked here |
| 08 | [The archive's positions at a first look: the network's prior, 32 visits, and every candidate at 512](08-archive-first-look.md) | done (the engine repository's `runs/archive_analysis/`, out of Git), checked here |
| 09 | [Bot games analysed for the win curve: the V2 gauntlet's middle](09-bot-games-analysis.md) | done (the engine repository's `runs/archive_analysis/`, out of Git), checked here |
| 10 | [The site's network at fewer visits: the GPU visit ladder analysed](10-visit-ladder-analysis.md) | done (the same folder), with the engine repository's test of the lead, checked here |
| 11 | [The notation, described for other developers: settle its open points and confirm the page](11-notation-page.md) | done (the engine repository's design 04), the page changed |
| 12 | [The engine's name: HedgeFund, with a name for each released network](12-network-names.md) | done (the release's manifest gives `displayName`. The rule is the engine repository's `v2/docs/design/20-network-names.md`), checked here |
| 13 | [The notation: where a branch goes, and the marks of a move's quality](13-branch-placement.md) | done (the engine repository's design 04: branches after their turn, PGN's six marks by turn, a note before the first turn, the `Annotator` tag), checked here |
| 14 | [The terms of the released engine and networks](14-release-terms.md) | done (the engine repository's commit `b76146a`, its v2 design 21: © 2026 Yshan, all rights reserved, with `LICENSE.txt` in each release), checked here |
| 15 | [Practice games against HedgeFund: the GTP bot in the browser](15-practice-bot.md) | done (release `wasm-v2-engine-51fbe9d`, and `54486cd`; the engine repository's v2 design 22), built here (design 24) |
| 16 | [A position's check: whether it could occur in a game](16-position-check.md) | done (protocol 0.5, release `wasm-v2-engine-27a7414`), the release checked here |
| 17 | [A release that searches as an earlier one: say so](17-same-search.md) | done (the engine repository's design 04, "The same search"; `search` in protocol 0.6), checked here |
| 18 | [Every position of a game in one request](18-describe-game.md) | done (`describe_game` in protocol 0.6.1, release `wasm-v2-engine-54486cd`), checked here |
| 19 | [A record from a set-up start: the number of its first turn](19-turn-numbers-after-position.md) | done (the engine repository's design 04, commit `85f1792`), the reader here as strict |
| 20 | [The practice bot from a set-up start](20-practice-set-up-start.md) | done (`enclosure-set-position`, interface 0.1.1, release `wasm-v2-engine-85f1792`), checked here |
