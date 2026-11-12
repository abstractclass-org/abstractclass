// The sites that link their games to Hedge School and take their players' reviews back (design 18): the shared code
// (@abstractclass/import/partners.ts), with Hedge School's parts. A link may name the page where its site takes a review
// back (`save`): only on a partner's own host, over https, so that the Export menu's "Save to …" sends a review only to
// the site that the game came from. A partner's page can also open a review that it kept (`from`): it sends the review
// file to the import page. Either way the review travels in the player's browser, by window messages between the two
// pages, when the player asks: this site has no server.
import { partnerSite, type Partner } from "@abstractclass/import/partners.ts";

export { PROTOCOL, type GamePartner, type Partner } from "@abstractclass/import/partners.ts";

/** The partner sites, by name and hosts. */
const PARTNERS: Partner[] = [{ name: "enclosuregame.com", hosts: ["enclosuregame.com", "www.enclosuregame.com"] }];

/** The partners' code with Hedge School's parts: its messages (`hedge-school:ready`, `:review`, `:saved` and
 *  `:failed`), its list, and the partners' test, which counts a partner's pages on the developer's own computer: in
 *  the build of the branch partner_test and in a local build made with VITE_PARTNER_TEST=1, never on the live site or
 *  the dev preview (vite.config.ts, design 18). */
export const { partnerOf, gamePartner, saveToPartner, receiveFromPartner, receiveKeptReview } = partnerSite({
  messages: "hedge-school", name: "Hedge School", partners: PARTNERS,
  test: import.meta.env?.VITE_PARTNER_TEST === "1",
});
