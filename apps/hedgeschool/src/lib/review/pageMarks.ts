// Hedge School's marks before the review page's first paint (@abstractclass/review/pageMarks.ts): its last review's key
// (src/lib/game/store.ts, lastReview), and its older addresses (+page.svelte, gameInAddress, and reviewArrives in
// @abstractclass/import's importHash.ts).
import { reviewPageMarks } from "@abstractclass/review/pageMarks.ts";
import { LAST_REVIEW } from "#lib/game/store.ts";

export const { script: REVIEW_PAGE_SCRIPT, mark: markReviewPage } = reviewPageMarks(LAST_REVIEW, true);
