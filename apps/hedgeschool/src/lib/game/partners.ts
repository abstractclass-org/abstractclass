// The sites that link their games to Hedge School and take their players' reviews back (design 18): Hedge School's
// parts of the shared code (@abstractclass/import/partners.ts), which says how a review travels between the pages.
import { partnerSite, type Partner } from "@abstractclass/import/partners.ts";

export type { GamePartner } from "@abstractclass/import/partners.ts";

/** The partner sites, by name and hosts. */
const PARTNERS: Partner[] = [{ name: "enclosuregame.com", hosts: ["enclosuregame.com", "www.enclosuregame.com"] }];

/** The partners' code with Hedge School's parts: its messages (`hedge-school:ready`, `:review`, `:saved` and
 *  `:failed`), its name, its list, and the partners' test (the build of the branch partner_test, or a local build made
 *  with VITE_PARTNER_TEST=1: vite.config.ts, design 18). */
export const { partnerOf, gamePartner, saveToPartner, receiveKeptReview } = partnerSite({
  messages: "hedge-school", name: "Hedge School", partners: PARTNERS,
  test: import.meta.env?.VITE_PARTNER_TEST === "1",
});
