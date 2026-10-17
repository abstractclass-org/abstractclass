// Not in the early access (design 11): its address leads home.
import { redirect } from "@sveltejs/kit";
import { EARLY_ACCESS } from "#lib/edition.ts";

export const load = () => {
  if (EARLY_ACCESS) redirect(307, "/");
};
