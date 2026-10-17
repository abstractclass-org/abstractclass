# No training on the engine's outputs, in the engine's terms

**Status:** open. **Asked:** 2026-10-17.

## What

The engine's terms (`LICENSE` in `abstractclass-org/enclosure-engine`, and `LICENSE.txt` in each release, from
[request 14](14-release-terms.md)) cover the files: only Hedge School serves them, and a visitor runs them in the
browser as the site serves them. They say nothing about what the engine produces. Please change the terms in two
ways:

1. **Add a clause on the outputs:** the engine's outputs (its analyses, moves, scores, win chances, policies and
   ownership, and the review files that hold them) must not be used to train, distil or tune another model, network or
   engine without the holder's written permission.
   - The clause must keep what the site's players and partners do now: a player keeps, shares and publishes their own
     reviews, and a partner site keeps the review files that its players save there (this repository's design 18).
     It forbids the use of the outputs as training data, not their use as analysis.
2. **Name the repository at its current address,** `github.com/abstractclass-org/enclosure-engine`. The terms still
   name its old address under the owner's personal account. GitHub redirects it today, but a redirect stops when that
   name is used again.

Then put the new terms in a release that this site can pin, as request 14's terms were (`wasm-v2-engine-27a7414`).

## Why

- **The networks reach every visitor.** The live site serves both networks as plain files
  (`/engine/b15c192-s66999040-d13350730/model-float16.bin`, 20,597,245 bytes, and the Lite network's, 6,499,365
  bytes), and the public releases give them without a sign-in. The terms already cover a copy of the files.
- **Distillation needs no copy.** The engine runs in the visitor's browser, so a visitor can query it without limit,
  at no cost to the site and with no server to limit the rate. A student network trained on those answers holds none
  of the files, so the current terms do not reach it.
- **No technical measure can stop it.** A file that the browser runs can be read: an encrypted network needs its key
  in the browser too. The terms are the protection that is left, and a clear clause is what the owner can point to.
- **What the browser gets is a separate question:** whether the site serves an older network than the one the owner
  plays tournaments with (this repository's issue abscls-fnp, "The licence of the engine's networks").

## Done when

- `enclosure-engine`'s `LICENSE` and a release's `LICENSE.txt` hold the clause and the current address.
- The engine repository tells this repository the release and the wording. This repository then pins the new terms
  file and its SHA-256 in `engine.lock.json`, and the notices page states the clause where it gives the engine's
  terms.
