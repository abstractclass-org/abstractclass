// Hedge School's marks before the review page's first paint (@abstractclass/review/pageMarks.ts): its last review's key
// (src/lib/game/store.ts, lastReview), and its older addresses, an older address's `?game=` and a tool's game from
// before the import page (+page.svelte, gameInAddress, and reviewArrives in @abstractclass/import's importHash.ts).
import { reviewPageMarks } from "@abstractclass/review/pageMarks.ts";
import { LAST_REVIEW } from "#lib/game/store.ts";

const marks = reviewPageMarks(LAST_REVIEW, true);

/** The script in the review page's head. */
export const REVIEW_PAGE_SCRIPT = marks.script;

/** Marks the page again as its code starts, for an address that a navigation in the page opened. */
export const markReviewPage = marks.mark;
