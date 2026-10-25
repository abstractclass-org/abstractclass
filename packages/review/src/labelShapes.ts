// The labels' marks as shapes on a 24-unit square, drawn in white on the badge's disc (LabelBadge.svelte), as
// chess.com's and Lichess's badges draw theirs: a character of the page's font sits at its own weight and height at
// 9 pixels, a shape stays even. The strokes end square, with rounded corners: SVG's stroke ends are round, square or
// flat, so a stroke ends flat and a rounded box continues it. The "!" bar and the dots are rounded boxes, each dot a
// little wider than its stroke. The check's elbow is round. Two marks ("?!", "??") are the single ones, smaller, side
// by side. These are drawn here: Lichess's glyph shapes are GPL-3.0 (chessground's glyph.ts), and chess.com's icons
// are its own. The thumbs-up is Material Design Icons' thumb_up (Google, Apache License 2.0), as in model.ts.
import { THUMB_UP } from "./enclosure.ts";
import type { Label } from "@abstractclass/analysis/labels.ts";

/** A stroke (flat ends, and its joins mitred or `round`), a filled path (its corners rounded by a stroke of `round`), or
 *  a box with rounded corners. */
export type LabelShape =
  | { kind: "stroke"; d: string; w: number; round?: boolean; t?: string }
  | { kind: "fill"; d: string; round: number; t?: string }
  | { kind: "box"; x: number; y: number; width: number; height: number; r: number; t?: string };

const R = 0.25; // a box's corner radius, as a share of the stroke's width
const END = 0.9; // how far a stroke's end box reaches past its flat end

/** The rounded end of a stroke of width `w` whose flat end is at (x, y), pointing out at `deg` degrees. It reaches
 *  back into the stroke past its own rounded corners, so that no notch shows where the two meet. */
function end(x: number, y: number, deg: number, w: number): LabelShape {
  const r = R * w, back = r + 0.05;
  return { kind: "box", x: -back, y: -w / 2, width: back + END, height: w, r, t: `translate(${x} ${y}) rotate(${deg})` };
}
/** The dot under a stroke of width `w`: a box a little wider than the stroke. */
const dot = (w: number): LabelShape => {
  const s = 1.08 * w;
  return { kind: "box", x: 12 - s / 2, y: 18.3 - s / 2, width: s, height: s, r: R * s };
};

// "!": a bar from the "?"'s top to its stem's foot, and a dot.
const BANG: LabelShape[] = [{ kind: "box", x: 10.5, y: 4.2, width: 3, height: 10, r: R * 3 }, dot(3)];
// "?": an arc about (12, 8.8) of radius 3.2, from 206° (its tip, which a box continues to 190°) to 60°, then a curve
// that leaves the arc along its tangent and turns straight down into the stem, whose box ends at 14.2.
const QUERY: LabelShape[] = [
  { kind: "stroke", d: "M9.126 7.392A3.2 3.2 0 1 1 13.6 11.571Q12 12.495 12 13.3", w: 2.8 },
  end(9.126, 7.392, 116.1, 2.8),
  end(12, 13.3, 90, 2.8),
  dot(2.8),
];
// The check: two arms from (7.3, 12.6) down to (10.6, 15.9) and up to (16.9, 9.1), their ends boxed, their elbow round.
const CHECK: LabelShape[] = [
  { kind: "stroke", d: "M7.936 13.236L10.6 15.9L16.288 9.76", w: 3, round: true },
  end(7.936, 13.236, -135, 3),
  end(16.288, 9.76, -47.2, 3),
];

/** A mark made smaller (`s`) about the square's middle row, its middle at `x`. */
const at = (shapes: LabelShape[], x: number, s: number) =>
  shapes.map(p => ({ ...p, t: `translate(${x} 12) scale(${s}) translate(-12 -12)${p.t ? ` ${p.t}` : ""}` }));

/** A star of five points, filled, its corners rounded by its stroke. */
function star(): LabelShape {
  const pts = Array.from({ length: 10 }, (_, k) => {
    const r = k % 2 ? 2.75 : 6.4, a = -Math.PI / 2 + (k * Math.PI) / 5;
    return `${(12 + r * Math.cos(a)).toFixed(2)} ${(12.4 + r * Math.sin(a)).toFixed(2)}`;
  });
  return { kind: "fill", d: `M${pts.join("L")}Z`, round: 1.2 };
}

export const LABEL_SHAPES: Record<Label, LabelShape[]> = {
  great: BANG,
  best: [star()],
  excellent: [{ kind: "fill", d: THUMB_UP, round: 0, t: "translate(5.2 5) scale(0.57)" }],
  good: CHECK,
  inaccuracy: [...at(QUERY, 9.7, 0.8), ...at(BANG, 16.7, 0.8)],
  mistake: QUERY,
  blunder: [...at(QUERY, 8.2, 0.78), ...at(QUERY, 15.8, 0.78)],
};
