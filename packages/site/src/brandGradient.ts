// A site's logo whose shapes a gradient fills (Mistak's design 34, "The site's frame"), on the drawing tools of
// brand.ts. A module of its own: the sites whose logos have no gradient do not import it, so their builds do not hold
// it.
import { shapeMarkup, svgTag, type Shape } from "./brand.ts";

/** A gradient across a shape, from its left edge to its right: its stops from 0 to 1, each with its colour and, where
 *  it is not opaque, its opacity. */
export interface Gradient {
  readonly stops: readonly (readonly [offset: number, color: string, opacity?: number])[];
}

/** A drawing: shapes, and shapes that a gradient fills (in the place of a `fill`). */
export type Drawing = readonly (readonly [...Shape, gradient?: Gradient])[];

const gradientMarkup = (id: string, { stops }: Gradient) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">`
  + stops.map(([offset, color, opacity]) => `<stop offset="${offset}" stop-color="${color}"`
    + `${opacity === undefined ? "" : ` stop-opacity="${opacity}"`}/>`).join("")
  + "</linearGradient></defs>";

/** A drawing's shapes as SVG elements, each after `indent`. Each gradient's id starts with `id`, which no other
 *  instance in the same page may have: a page's component gives its own, and a document one name. */
export const drawingMarkup = (drawing: Drawing, id: string, indent = "") =>
  drawing.map(([tag, attrs, gradient], i) => {
    if (!gradient) return shapeMarkup([[tag, attrs]], indent);
    const own = `${id}-${i}`;
    return indent + gradientMarkup(own, gradient) + shapeMarkup([[tag, { ...attrs, fill: `url(#${own})` }]], indent);
  }).join("");

/** A drawing as an SVG document of `size` pixels, as brand.ts's svgDocument. */
export const drawingDocument = (drawing: Drawing, size: number, id: string, comment = "") =>
  svgTag(size) + (comment && `\n  <!-- ${comment} -->`) + drawingMarkup(drawing, id, "\n  ") + "\n</svg>\n";
