# The terms of the released engine and networks

**Status:** open. **Asked:** 2026-10-13.

## What

The public releases repository, `seankao31/enclosure-engine`, has no licence file, and its releases state no terms
for the project's own work. Please decide those terms, and state them where the files are. In detail:

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
