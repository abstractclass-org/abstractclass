// A failure that the player can mend, with the site's own line for it. A page shows the line as it is, in place of its
// line for a failure that it cannot explain. The line is text that a player follows: strict Simplified Technical
// English, in the form of the engine's lines (engineLines.ts): what failed, then what the player can do. The failure is
// not the site's fault, so it sends no error report: a browser that blocks the partner's tab (pop-ups) is one.

/** An error whose `line` the page shows. Its message is the line too: a page or a log that reads only the message
 *  gets the same words. */
export class LineError extends Error {
  readonly line: string;
  constructor(line: string) {
    super(line);
    this.name = "LineError";
    this.line = line;
  }
}

/** The line that a page shows for a caught error: a LineError's own line, else `otherwise`, the page's line for a
 *  failure that it cannot explain. */
export const lineOf = (e: unknown, otherwise: string) => (e instanceof LineError ? e.line : otherwise);
