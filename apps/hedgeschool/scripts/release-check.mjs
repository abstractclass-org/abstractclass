// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back"), against one address: the live site,
// hedgeschool.pages.dev, or a preview. Run it in apps/hedgeschool after the workflow Deploy has finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// <commit> is the commit that the deploy built, in any form that Git reads (a hash, origin/main). Without it: the live
// site and hedgeschool.pages.dev take origin/main, and dev's preview takes origin/dev, as of the last `git fetch`.
// An address that does not end in .pages.dev is the live site: it has no X-Robots-Tag, and its domain's answers are
// signed (DNSSEC). It reads the engine's files as the page does, by the site's manifest, and checks them against
// engine.lock.json. It sends one POST that is not JSON to the practice games' Function, which answers 400 and stores
// nothing. Each line says PASS, FAIL or INFO. The last line is `release-check: PASS` or `release-check: FAIL`.
//
// The checks that every site shares are in @abstractclass/site/release-check.mjs (design 29). Hedge School's own are
// here: the pages that are not in the early access, and the practice games' Function. Cyanotype's
// scripts/release-check.mjs has neither, and says why.
import { releaseCheck } from "@abstractclass/site/release-check.mjs";

await releaseCheck({
  lock: new URL("../engine.lock.json", import.meta.url),
  branchOf: { "hedgeschool.pages.dev": "origin/main", "dev.hedgeschool.pages.dev": "origin/dev" },
  menu: ["Practice", "Review", "Analysis", "Tools", "Notation", "About"],
  // The pages that are not in the early access lead home: a redirect, or a page that refreshes to /.
  leadHome: ["/puzzles", "/learn", "/lab/engine"],
  // The practice games' Function.
  ownChecks: async (base, check) => {
    const practiceGames = await fetch(`${base}/api/practice-games`, {
      method: "POST", body: "not json", headers: { "content-type": "text/plain" },
    });
    check("the Function on /api/practice-games answers 400 to a request that is not JSON",
      practiceGames.status === 400, String(practiceGames.status));
  },
});
