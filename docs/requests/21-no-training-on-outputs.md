# No training on the engine's outputs, in the engine's terms

**Status:** done: the engine repository's commit `ef6e24e`, release `wasm-v2-engine-85f1792-terms2`, checked here,
pinned here and stated on the notices page. **Asked:** 2026-10-17. **Delivered:** 2026-10-17.

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

## Delivered

The engine repository's commit `ef6e24e` (its issue abscls-ahq) and its design 21
(`games/enclosure/docs/design/21-release-terms.md`), in the release `wasm-v2-engine-85f1792-terms2`:

- **The clause:** `LICENSE.txt` has a new section, "The engine's outputs". The outputs are the analyses, moves, scores,
  win chances, policies, ownership, and the review files that hold them. Anyone may keep, share and publish them as
  analysis, and players and the sites that the holder works with may do so too. No one may use them to train, distil
  or tune another model, network or engine without the holder's written permission, asked through an issue in
  `enclosure-engine`. So a player's reviews and a partner site's review files (design 18) stay permitted.
- **The address:** the terms name the repository as `github.com/abstractclass-org/enclosure-engine`. The terms of
  request 14 (`78e54748...`, 1,487 bytes) named its old address.
- **The release:** `wasm-v2-engine-85f1792-terms2` holds the files of `wasm-v2-engine-85f1792` byte for byte, the new
  `LICENSE.txt` (SHA-256 `e457cfd8...`, 2,032 bytes) and a new manifest. Design 21 now says that a change of terms
  comes in a release of its own, under the pinned release's tag with a suffix. The releases already published keep
  their files.
- **The wording for the notices page:** the section itself, word for word: "The engine's outputs. The engine's
  outputs are what these files produce: analyses, moves, scores, win chances, policies, ownership, and the review
  files that hold them. You may keep, share and publish the outputs as analysis, for example the review of a game.
  Players and the sites that the holder works with may do so too. You must not use the outputs to train, distil or
  tune another model, network or engine, unless you have written permission from the holder. To ask, open an issue in
  the repository."

**Checked here:**

- Each file that `engine.lock.json` pins is in the new release, with the lock's SHA-256 and size (GitHub's digests).
  The release's manifest differs from 85f1792's only in the repository's address, the tag, and the SHA-256 and size of
  `LICENSE.txt`.
- The lock pins the new `LICENSE.txt` (id `engine-85f1792-terms2`). `npm run engine -- --deploy` fetched it from the
  release and checked its SHA-256.
- The notices page states the section after the engine's paragraph. In the build, its text is the section of the
  shipped `LICENSE.txt`, word for word. "The repository" links to `enclosure-engine`, the lock's `repository`.
- The local build served the new file at the path that the page links to (`/engine/engine-85f1792-terms2/LICENSE.txt`,
  2,032 bytes, the locked SHA-256). In Playwright's Chromium, the page's `LICENSE.txt` link opened it.
