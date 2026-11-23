// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back", and section 10), against one address:
// the project's pages.dev address or a preview, and the live site after its launch. Run it in apps/mistak after the
// workflow Deploy has finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// The checks, and the commit that each address takes without <commit>, are those that every site shares
// (@abstractclass/site/release-check.mjs, design 29). Mistak ships no engine release yet (design 34, "Before the
// network"), so it gives its folder in the place of an engine lock, and its check has no engine's lines. The engine's
// work gives the lock here. Its pages.dev address is the project's, which Cloudflare gives when the project is made
// (docs/hosting.md, section 10, step 1): mistak.pages.dev if that address is free.
import { releaseCheck } from "@abstractclass/site/release-check.mjs";

await releaseCheck({
  folder: new URL("../", import.meta.url),
  branchOf: { "mistak.pages.dev": "origin/main", "dev.mistak.pages.dev": "origin/dev" },
  menu: ["Notation", "About"],
});
