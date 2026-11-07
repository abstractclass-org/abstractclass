// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back", and section 9), against one address:
// the live site, cyanotype-ztp.pages.dev, or a preview. Run it in apps/cyanotype after the workflow Deploy has
// finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// The checks, and the commit that each address takes without <commit>, are those that every site shares
// (@abstractclass/site/release-check.mjs, design 29). Hedge School gives them its pages that lead home and adds a
// check of its Function. Cyanotype does neither (design 33):
// - Its early access hides no page: it has none of Hedge School's prototype pages, so no page leads home.
// - It has no Function and no storage at Cloudflare (docs/hosting.md, section 9).
import { releaseCheck } from "@abstractclass/site/release-check.mjs";

await releaseCheck({
  lock: new URL("../engine.lock.json", import.meta.url),
  branchOf: { "cyanotype-ztp.pages.dev": "origin/main", "dev.cyanotype-ztp.pages.dev": "origin/dev" },
  menu: ["Practice", "Review", "Analysis", "Tools", "Notation", "About"],
});
