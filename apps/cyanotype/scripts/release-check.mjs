// The checks of a deployed site (docs/hosting.md, "Deploy, check and roll back", and section 9), against one address:
// the live site, cyanotype-ztp.pages.dev, or a preview. Run it in apps/cyanotype after the workflow Deploy has
// finished:
//   node scripts/release-check.mjs <base URL> [<commit>]
// The checks, and the commit that each address takes without <commit>, are those that every site shares
// (@abstractclass/site/release-check.mjs, design 29). Cyanotype adds Hedge School's check of the practice games'
// Function: one POST that is not JSON, which it answers with 400 and stores nothing. Its early access hides no page:
// it has none of Hedge School's prototype pages, so no page leads home (design 33).
import { releaseCheck } from "@abstractclass/site/release-check.mjs";

await releaseCheck({
  lock: new URL("../engine.lock.json", import.meta.url),
  branchOf: { "cyanotype-ztp.pages.dev": "origin/main", "dev.cyanotype-ztp.pages.dev": "origin/dev" },
  menu: ["Practice", "Review", "Analysis", "Tools", "Notation", "About"],
  // The practice games' Function (docs/hosting.md, "Cyanotype's practice games").
  ownChecks: async (base, check) => {
    await check("the Function on /api/practice-games answers 400 to a request that is not JSON", async () => {
      const practiceGames = await fetch(`${base}/api/practice-games`, {
        method: "POST", body: "not json", headers: { "content-type": "text/plain" },
      });
      return [practiceGames.status === 400, String(practiceGames.status)];
    });
  },
});
