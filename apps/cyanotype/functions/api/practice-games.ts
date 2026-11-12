// Practice games against Stamp Duty, stored when they end (docs/design/33-cyanotype.md, "Practice against Stamp Duty";
// Hedge School's design 25): POST keeps a game, DELETE removes the games of a browser's random number. A Pages Function
// on Cyanotype's own Cloudflare project, with a D1 database bound as GAMES: the production deployment's own, and the
// previews' own (docs/hosting.md, "Cyanotype's practice games"). The schema is in migrations/. The handlers are the
// practice's (@abstractclass/practice/storedFunction.ts), as Hedge School's, with Blueprints' check and the schema's
// count of a record's moves. The Function keeps no IP address, logs no request, and answers no reads: the games are read
// in Cloudflare's dashboard, or exported from it.
import { practiceGamesFunction, type Context } from "@abstractclass/practice/storedFunction.ts";
import { BLUEPRINTS } from "../../src/lib/practice/stored.ts";

export type { D1 } from "@abstractclass/practice/storedFunction.ts";

const games = practiceGamesFunction(BLUEPRINTS, "moves");

/** Keeps a game: 201 when kept now, 200 when it is kept already or its number's games were deleted. */
export const onRequestPost = (context: Context): Promise<Response> => games.post(context);

/** Deletes the games of a browser's random number (the privacy page's "Delete my practice games"): their count. */
export const onRequestDelete = (context: Context): Promise<Response> => games.remove(context);
