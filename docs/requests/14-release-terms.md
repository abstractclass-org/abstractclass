# The terms of the released engine and networks

**Status:** done, checked here. **Asked:** 2026-10-13. **Delivered:** 2026-10-13.

## What

The public releases repository, `abstractclass-org/enclosure-engine`, has no licence file, and its releases state no
terms for the project's own work. Please decide those terms, and state them where the files are. In detail:

1. **Decide the terms of the project's own work in each release:**
   - the module's changes to KataGo (`enclosure-engine.wasm`), the GPU module (`enclosure-engine-gpu.wasm`) and its
     JavaScript (`gpu_engine.mjs`)
   - the networks (`model-float16.bin`) and their ONNX graphs (`model.onnx`)

   Two choices are near the terms of this site (below): all rights reserved, with Hedge School named as permitted to
   serve the files, or a licence for non-commercial use only. The networks can have terms apart from the code. It is
   not settled law whether a network's weights are under copyright at all, so the stated terms are what a reader
   relies on.
2. **Keep the works of others under their own licences.** KataGo's code stays under MIT, and the other works in
   `NOTICES.txt` stay under theirs. Those licences cannot change. The terms of item 1 cover only what the project
   wrote and trained.
3. **State the terms where the files are:** a licence or terms file in `enclosure-engine`, and the same text in each
   release, for example as the first section of `NOTICES.txt` or as a file of its own. A release that this site
   pins must carry its terms, so that a copy of the files carries them too.
4. **Tell this repository the wording,** so that the site's notices page can state it.

## Why

- **Hiding the files does not protect them.** The site serves the module, the GPU module and both networks to each
  visitor (`/engine/<id>/<file>`, listed in `/engine/manifest.json`). Making the releases private would also stop the
  site's build, which downloads them without a login.
- **The site's notices page reads as if the whole engine were under MIT.** It says that the engine is built "from a
  fork of KataGo, under KataGo's licence", and it says nothing about the networks. With no terms stated, a reader can
  take the networks and the project's changes as free to use for any purpose.
- **Other Enclosure sites now exist,** and one has asked to work with Hedge School. Clear terms let the owner discuss
  what others may use, and on what conditions.
- **The site's own terms are set** (this repository's `docs/design/11-early-access.md`, item 10): its code, text and
  design are "© 2026 Yshan", all rights reserved. The notices page states this first, and then the licences of the
  works of others.

## Done when

- `enclosure-engine` and the release that the site pins state the terms of the project's own work, apart from the
  licences of the works of others.
- The engine repository tells this repository the wording. This repository then changes the notices page: the
  engine's paragraph names the project's terms for the module and the networks, and KataGo's licence for KataGo's
  code. If the terms change a file of the pinned release, such as `NOTICES.txt`, the site pins the file's new
  SHA-256 in `engine.lock.json`.

## Delivered

The engine repository's commit `336d654` and its design `v2/docs/design/21-release-terms.md`:

- **The terms:** the project's own work is "© 2026 Yshan, all rights reserved": the engine's own code in both
  modules, `gpu_engine.mjs`, the networks and their graphs, the manifests and the other text of the repository and
  its releases. The networks have the same terms as the code.
- **Two permissions:** Hedge School serves and runs the files, and its visitors run them in the browser as the site
  serves them. Any other use needs written permission, asked through an issue in `enclosure-engine`.
- **The works of others keep their licences:** KataGo's code under MIT, and each work in `NOTICES.txt` under its own.
- **Where:** `LICENSE` at the root of `enclosure-engine`, and `LICENSE.txt` (kind `terms`) in each release. The three
  earlier releases (`85c2adb`, `06534ee`, `632f2a0`) got `LICENSE.txt` as an added file. From the release `fdfe5ad`
  on, `NOTICES.txt` names both modules and points to `LICENSE.txt`.
- **The wording for the notices page** (design 21): "The engine, HedgeFund, and its networks: © 2026 Yshan, all rights
  reserved. The engine is built from a fork of KataGo. KataGo's code is under the MIT licence, and the other works
  that the engine compiles in are under their own licences. Each engine release carries its terms (`LICENSE.txt`) and
  these licences (`NOTICES.txt`)."

**Checked here:** `LICENSE.txt` in `wasm-v2-engine-632f2a0` and in `wasm-v2-engine-fdfe5ad` has the SHA-256 that the
engine repository gave (`78e54748...`, 1,487 bytes), and `NOTICES.txt` of `632f2a0` is unchanged. The site moved to the
release `fdfe5ad` at once (decisions/engine.md, "The release fdfe5ad"), so it pins `LICENSE.txt` from that release
(`engine.lock.json`, kind `terms`) and ships it beside the modules. The notices page gives the wording above, with
links to the two files, and KataGo's copyright notice with the MIT licence's text. Both links answered in the local
build.
