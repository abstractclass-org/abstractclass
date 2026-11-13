// Cyanotype's marks before the review page's first paint (@abstractclass/review/pageMarks.ts), as Hedge School's: its
// last review's key (site.ts), and no older addresses. The review page takes a kept game (`#game=`), a shared review
// (`#packed=`) and a partner's kept review (`#from=`) after the `#` (src/routes/review/+page.svelte).
import { reviewPageMarks } from "@abstractclass/review/pageMarks.ts";
import { LAST_REVIEW_KEY } from "#lib/site.ts";

const marks = reviewPageMarks(LAST_REVIEW_KEY, false);

/** The script in the review page's head. */
export const REVIEW_PAGE_SCRIPT = marks.script;

/** Marks the page again as its code starts, for an address that a navigation in the page opened. */
export const markReviewPage = marks.mark;
