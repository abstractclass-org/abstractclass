// The sites that link their games to Cyanotype and take their players' reviews back (design 33, "Partner sites", on
// Hedge School's design 18): Cyanotype's parts of the shared code (@abstractclass/import/partners.ts), which says how a
// review travels between the pages.
import { partnerSite, type Partner, type PartnerSite } from "@abstractclass/import/partners.ts";

export type { GamePartner } from "@abstractclass/import/partners.ts";

/** The partner sites, by name and hosts: none until a site asks to be a partner (design 33, "Partner sites"). */
const PARTNERS: Partner[] = [];

/** Cyanotype's parts: its messages (`cyanotype:ready`, `:review`, `:saved` and `:failed`), its name and its list, with
 *  the partners' test on or off. A test gives the switch. */
export const cyanotypeSite = (test: boolean): PartnerSite => ({ messages: "cyanotype", name: "Cyanotype", partners: PARTNERS, test });

/** The partners' code with Cyanotype's parts, and the partners' test in the build of the branch partner_test or in a
 *  local build made with VITE_PARTNER_TEST=1 (vite.config.ts). */
export const { partnerOf, gamePartner, saveToPartner, receiveKeptReview } =
  partnerSite(cyanotypeSite(import.meta.env?.VITE_PARTNER_TEST === "1"));
