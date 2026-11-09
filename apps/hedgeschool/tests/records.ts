// The test games' records, cut to their first turns, for the tests and the scripts of both sites: a record's tags,
// then a blank line, then its moves in turns ("1. ... 2. ... ...") and its result.

/** The record `text` up to the end of turn `turns`: its tags but the result's and the scores', and its moves to the
 *  end of that turn. Without a later turn, the moves end before the record's last word, its result. */
export function firstTurns(text: string, turns: number): string {
  const [tags, moves] = text.split(/\r?\n\r?\n/);
  const words = moves.trim().split(/\s+/), next = words.indexOf(`${turns + 1}.`);
  const kept = tags.split(/\r?\n/).filter(t => !/^\[(Result|Scores) /.test(t));
  return `${kept.join("\n")}\n\n${words.slice(0, next).join(" ")}\n`;
}
