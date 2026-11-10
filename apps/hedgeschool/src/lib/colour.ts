// The colour arithmetic of the checks that compare the site's colours: sRGB's channels, OKLab (Björn Ottosson's
// matrices, which CSS Color 4 and the browser's color-mix use), the distance between two colours in OKLab, and WCAG
// 2.2's relative luminance and contrast ratio. Its users: symbolShades.test.ts, review/weakWalls.test.ts and
// scripts/measure/wall-rings.mjs. Only Hedge School's tests and scripts use it, so it stays in Hedge School (design 29
// moves a part into packages/ when another site needs it). Its tests: colour.test.ts.

/** A colour's three channels: linear sRGB's red, green and blue, or OKLab's L, a and b. */
export type Channels = number[];

/** A colour "#rrggbb" as linear sRGB, each channel from 0 to 1. */
export const hexToLinear = (hex: string): Channels => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
  .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));

/** A linear sRGB colour as "#rrggbb", each channel rounded to the nearest of 256. */
export const linearToHex = (rgb: Channels): string => "#" + rgb
  .map(c => Math.round((c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255))
  .map(c => c.toString(16).padStart(2, "0")).join("");

/** OKLab, from linear sRGB. */
export function linearToOklab([r, g, b]: Channels): Channels {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

/** Linear sRGB from OKLab, each channel kept in sRGB's range (0 to 1), as the browser shows a colour out of it. */
export function oklabToLinear([L, a, b]: Channels): Channels {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3, m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s]
    .map(c => Math.min(1, Math.max(0, c)));
}

/** OKLab, from a colour "#rrggbb". */
export const hexToOklab = (hex: string): Channels => linearToOklab(hexToLinear(hex));

/** The distance between two OKLab colours (ΔE in OKLab, on its scale of 0 to 1). */
export const distance = (x: Channels, y: Channels): number => Math.hypot(...x.map((v, i) => v - y[i]));

/** The mix of two OKLab colours, `share` (0 to 1) of `x` and the rest of `y`, as `color-mix(in oklab, x, y)` mixes. */
export const mix = (x: Channels, y: Channels, share: number): Channels => y.map((v, i) => v + (x[i] - v) * share);

/** WCAG's relative luminance of a linear sRGB colour. */
export const luminance = ([r, g, b]: Channels): number => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** WCAG's contrast ratio of two linear sRGB colours, from 1 to 21. */
export function contrast(x: Channels, y: Channels): number {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}
