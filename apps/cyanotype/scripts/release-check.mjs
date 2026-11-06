// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back", and section 9), as Hedge School's,
// against one address: the live site, cyanotype-ztp.pages.dev, or a preview. Run it in apps/cyanotype after the
// workflow Deploy has finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// <commit> is the commit that the deploy built, in any form that Git reads (a hash, origin/main). Without it: the live
// site and cyanotype-ztp.pages.dev take origin/main, and dev's preview takes origin/dev, as of the last `git fetch`.
// An address that does not end in .pages.dev is the live site: it has no X-Robots-Tag, and its domain's answers are
// signed (DNSSEC). It reads the engine's files as the page does, by the site's manifest, and checks them against
// engine.lock.json. It reads public pages only. Each line says PASS, FAIL or INFO. The last line is
// `release-check: PASS` or `release-check: FAIL`.
//
// The checks that every site shares are in @abstractclass/site/release-check.mjs (design 29). Hedge School's own two
// have no counterpart here:
// - The pages that are not in the early access lead home (/puzzles, /learn, /lab/engine): Cyanotype has no edition
//   (design 33, "The gaps from Hedge School"), so it has none of these pages, and an unknown address answers 404.
// - The practice games' Function answers 400: Cyanotype has no Function and no storage at Cloudflare (docs/hosting.md,
//   section 9).
import { releaseCheck } from "@abstractclass/site/release-check.mjs";

await releaseCheck({
  lock: new URL("../engine.lock.json", import.meta.url),
  branchOf: { "cyanotype-ztp.pages.dev": "origin/main", "dev.cyanotype-ztp.pages.dev": "origin/dev" },
  menu: ["Practice", "Review", "Analysis", "Tools", "Notation", "About"],
});
