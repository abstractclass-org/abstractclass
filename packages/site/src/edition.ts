// The site's edition (Hedge School's design 11, "One build switch", and Cyanotype's design 33): the full site, for
// development, or the early access. The build sets it: VITE_EDITION=early. Both sites read it here.
export const EARLY_ACCESS = import.meta.env.VITE_EDITION === "early";
