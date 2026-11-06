// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back"), against one address: the live site,
// hedgeschool.pages.dev, or a preview. Run it in apps/hedgeschool after the workflow Deploy has finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// The checks, and the commit that each address takes without <commit>, are those that every site shares
// (@abstractclass/site/release-check.mjs, design 29). Hedge School gives them its pages that are not in the early
// access, and adds the check of the practice games' Function: one POST that is not JSON, which it answers with 400 and
// stores nothing.
import { releaseCheck } from "@abstractclass/site/release-check.mjs";

await releaseCheck({
  lock: new URL("../engine.lock.json", import.meta.url),
  branchOf: { "hedgeschool.pages.dev": "origin/main", "dev.hedgeschool.pages.dev": "origin/dev" },
  menu: ["Practice", "Review", "Analysis", "Tools", "Notation", "About"],
  // The pages that are not in the early access (design 11).
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
