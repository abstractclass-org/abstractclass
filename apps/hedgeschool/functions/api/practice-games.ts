// Practice games, stored when they end (docs/design/25-practice-games-stored.md): POST keeps a game, DELETE removes the
// games of a browser's random number. A Pages Function on the site's own Cloudflare project, with a D1 database bound
// as GAMES: the production deployment's own, and the previews' own (docs/hosting.md, "Practice games"). The schema is
// in migrations/. The handlers are the practice's (@abstractclass/practice/storedFunction.ts), with Enclosure's check
// and the schema's count of a record's edges. The Function keeps no IP address, logs no request, and answers no reads:
// the games are read in Cloudflare's dashboard, or exported from it.
import { practiceGamesFunction } from "@abstractclass/practice/storedFunction.ts";
import { ENCLOSURE } from "../../src/lib/practice/stored.ts";

export type { D1 } from "@abstractclass/practice/storedFunction.ts";

// POST keeps a game: 201 when kept now, 200 when it is kept already or its number's games were deleted. DELETE
// deletes the games of a browser's random number (the privacy page's "Delete my practice games"): their count.
export const { onRequestPost, onRequestDelete } = practiceGamesFunction(ENCLOSURE, "edges");
