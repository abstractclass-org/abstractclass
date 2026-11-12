// The sites that link their games to Cyanotype and take their players' reviews back (design 33, "Partner sites", on
// Hedge School's design 18): Cyanotype's parts of the shared code (@abstractclass/import/partners.ts), which says how a
// review travels between the pages.
import { partnerSite, type Partner } from "@abstractclass/import/partners.ts";

export type { GamePartner } from "@abstractclass/import/partners.ts";

/** The partner sites, by name and hosts: none until a site asks to be a partner (design 33, "Partner sites"). */
const PARTNERS: Partner[] = [];

/** The partners' code with Cyanotype's parts: its messages (`cyanotype:ready`, `:review`, `:saved` and `:failed`), its
 *  name, its list, and the partners' test (the build of the branch partner_test, or a local build made with
 *  VITE_PARTNER_TEST=1: vite.config.ts). */
export const { partnerOf, gamePartner, saveToPartner, receiveKeptReview } = partnerSite({
  messages: "cyanotype", name: "Cyanotype", partners: PARTNERS,
  test: import.meta.env?.VITE_PARTNER_TEST === "1",
});
