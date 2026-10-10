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
