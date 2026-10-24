// The book's area map (design 30; design 32, "The book file"; form.ts, BookPosition `area`): the ownership of each
// point, one byte a point, in base64. Each byte is a signed number from -100 to 100: the ownership in hundredths from
// Blue's side, as the site stores an analysis's ownership (@abstractclass/analysis/model.ts, Analysis `ownership`).
// The points come in the engine's order: index y * 19 + x, y from the bottom (@abstractclass/engine/protocol.ts,
// AnalysisReply `ownership`).

const SIZE = 19;
export const POINTS = SIZE * SIZE;

/** The area map of an ownership in hundredths from Blue's side. */
export function encodeArea(hundredths: number[]): string {
  if (hundredths.length !== POINTS) throw new Error(`an area map has ${POINTS} points, not ${hundredths.length}`);
  const bytes = Int8Array.from(hundredths, v => Math.max(-100, Math.min(100, Math.round(v))));
  return btoa(String.fromCharCode(...new Uint8Array(bytes.buffer)));
}

/** The ownership in hundredths from Blue's side of an area map. */
export function decodeArea(area: string): number[] {
  const bytes = Uint8Array.from(atob(area), c => c.charCodeAt(0));
  if (bytes.length !== POINTS) throw new Error(`an area map has ${POINTS} points, not ${bytes.length}`);
  return [...new Int8Array(bytes.buffer)];
}

/** The area map of the mirror image (row r to row 20 - r, notation.ts `mirrorPosition`). */
export function mirrorArea(area: string): string {
  const own = decodeArea(area);
  return encodeArea(own.map((_, i) => own[(SIZE - 1 - Math.floor(i / SIZE)) * SIZE + (i % SIZE)]));
}
