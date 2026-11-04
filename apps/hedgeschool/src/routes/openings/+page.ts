// Openings (design 32), in the builds that have it (edition.ts, OPENINGS). Elsewhere the build has no page for its
// address, and the site's 404 page then leads home.
import { redirect } from "@sveltejs/kit";
import { OPENINGS } from "#lib/edition.ts";

export const prerender = OPENINGS;

export const load = () => {
  if (!OPENINGS) redirect(307, "/");
};
