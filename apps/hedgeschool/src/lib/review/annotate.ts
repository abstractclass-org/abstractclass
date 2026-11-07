// A reviewed game as an annotated record (design 13), as Lichess exports a game it analysed: the record's tags and
// turns, the engine's view after each edge as `[%eval W L S]`, each Inaccuracy, Mistake, Blunder and Great as a
// comment ("Mistake. D10-G9 G9-H10 was best.", Lichess's words), "A hard position." where the review marks one, the
// record's clocks, and the player's own lines as variations, with turns' quality marks by turn. The record is the
// shared one (@abstractclass/analysis/annotate.ts), which also says where a variation goes. Enclosure's part: an edge
// with its cut mark (`D10-G10x`). The notation is the engine repository's (its docs/design/04-notation-and-protocol.md,
// and the site's /notation page). A reader takes the game back from it (the variations are skipped), and the site
// reviews it again: the engine's full results stay in the review file (game/reviewFile.ts).
import * as shared from "@abstractclass/analysis/annotate.ts";
import { enclosure, moveNotation, type Enclosure } from "./enclosure.ts";
export { evalCommand } from "@abstractclass/analysis/annotate.ts";

export type AnnotateInput = shared.AnnotateInput<Enclosure>;

/** The annotated record, each edge played with its cut mark (moveNotation). */
export const annotatedRecord = (input: AnnotateInput): string => shared.annotatedRecord(enclosure, moveNotation, input);
