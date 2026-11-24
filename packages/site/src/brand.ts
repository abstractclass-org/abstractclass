// The drawing tools of a site's logo (Cyanotype's design 33, "The logo", and Mistak's design 34, "The site's
// frame"): a drawing is a list of shapes in a view of 100 × 100, which a site's Logo.svelte draws in the page and its
// scripts/brand.mjs draws to the site's files (brandFiles.ts). Each site keeps its own drawings in its
// src/lib/brand/logo.ts.

/** One shape of a drawing: its SVG element and its attributes. */
export type Shape = readonly ["rect" | "path", Readonly<Record<string, string | number>>];

/** A drawing's shapes as SVG elements, each after `indent`. */
export const shapeMarkup = (shapes: readonly Shape[], indent = "") =>
  shapes.map(([tag, a]) => `${indent}<${tag}${Object.entries(a).map(([k, v]) => ` ${k}="${v}"`).join("")}/>`).join("");

/** A drawing's opening tag: `size` pixels for the view of 100 × 100, then `attributes`, each after a space. */
export const svgTag = (size: number, attributes = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}"${attributes}>`;

/** A drawing as an SVG document of `size` pixels, which a browser draws as a file and an `<img>` shows. */
export const svgDocument = (shapes: readonly Shape[], size = 100, comment = "") =>
  svgTag(size) + (comment && `\n  <!-- ${comment} -->`) + shapeMarkup(shapes, "\n  ") + "\n</svg>\n";

/** A drawing as one SVG element of `size` pixels, on one line and hidden from screen readers, for a page that is not
 *  the site's own: a tool's button on a play site's page, and Tampermonkey's lists. */
export const svgElement = (shapes: readonly Shape[], size: number) =>
  svgTag(size, ' aria-hidden="true"') + shapeMarkup(shapes) + "</svg>";
