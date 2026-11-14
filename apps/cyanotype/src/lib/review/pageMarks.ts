// Cyanotype's marks before the review page's first paint (@abstractclass/review/pageMarks.ts): its last review's key
// (site.ts), and no older addresses.
import { reviewPageMarks } from "@abstractclass/review/pageMarks.ts";
import { LAST_REVIEW_KEY } from "#lib/site.ts";

export const { script: REVIEW_PAGE_SCRIPT, mark: markReviewPage } = reviewPageMarks(LAST_REVIEW_KEY);
