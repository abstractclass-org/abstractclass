// The image of a line (design 07, item 17), its frame and its theme, for each site: the board's component drawn apart
// from the page in the page's theme, with its computed colours and fonts written into each element of its SVG, then
// drawn on a canvas with a caption under it and the site's name. The animated image is a GIF of such canvases (gif.ts).
// Both copied and saved, in the player's browser, with no server. Lichess renders its board images on its server, from
// the position's FEN. An image has the look of the theme that the page shows when the player asks for it, light or
// dark, so that it matches the board on the player's screen (decisions/product.md, "An image of a line in the player's
// theme"). A board's styles are read in one task, and a change of theme between two frames of an animated image starts
// that image again in the new theme: no image mixes the two themes. Each site gives its board's component and, where
// the board is more than one SVG, its own drawing of it (`BoardSvg`); the view's `image` comes from lineImage below.
import { flushSync, mount, unmount, type Component } from "svelte";
import { download } from "@abstractclass/site/download.ts";
import type { ImageBoard, ImageParts, ViewTypes } from "./game.ts";
import { addFrame, animatedGif, type GifFrame } from "./gif.ts";

/** The properties that a board's style sets on its elements, written into the copy: the image has no stylesheet. The
 *  copy keeps the elements' own attributes (fill-rule, stroke-linejoin). Hedge School's board needs these. */
export const STYLED = ["visibility", "opacity", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray",
                       "stroke-linecap", "stroke-opacity", "font-family", "font-size", "font-weight", "text-anchor"];

/** A copy of `svg` with each element's computed style (the properties `styled`) in its own style attribute, and no
 *  class. */
export function styledCopy(svg: SVGSVGElement, styled: readonly string[] = STYLED): SVGSVGElement {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const from = [svg, ...svg.querySelectorAll("*")], to = [copy, ...copy.querySelectorAll("*")];
  from.forEach((el, i) => {
    const css = getComputedStyle(el);
    to[i].setAttribute("style", styled.map(p => `${p}:${css.getPropertyValue(p)}`).join(";"));
    to[i].removeAttribute("class");
  });
  return copy;
}

/** A board's drawing, from the host that the site drew its component in: an SVG's markup that stands alone, `width`
 *  pixels wide, and its height in pixels. */
export type BoardSvg = (host: HTMLElement, width: number) => { markup: string; height: number };

/** The drawing of a board that is one SVG, square (Hedge School's): the host's SVG, `width` pixels square. */
export const squareSvg: BoardSvg = (host, width) => {
  const copy = styledCopy(host.querySelector("svg")!);
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", `${width}`);
  copy.setAttribute("height", `${width}`);
  return { markup: new XMLSerializer().serializeToString(copy), height: width };
};

/** What a site gives for its image of a line: its board's component, the component's properties for a board of the
 *  image, its drawing of the board (squareSvg when not given), the caption, the saved file's name, and the site's
 *  name, small, under the caption. */
export interface LineImageSite<G extends ViewTypes, P extends Record<string, any>> {
  Board: Component<P>;
  props(board: ImageBoard<G>): P;
  svg?: BoardSvg;
  caption: ImageParts<G>["caption"];
  name: ImageParts<G>["name"];
  site: string;
}

/** The view's image of a line (@abstractclass/review/game.ts, ImageParts) for a site: the PNG, the animated GIF, the
 *  copy to the clipboard, and the saved file (@abstractclass/site/download.ts). */
export function lineImage<G extends ViewTypes, P extends Record<string, any>>(site: LineImageSite<G, P>):
  ImageParts<G> {
  const drawing: Drawing<P> = { Board: site.Board, svg: site.svg ?? squareSvg, site: site.site };
  return {
    draw: (board, caption, width) => boardImage(drawing, site.props(board), caption, width),
    animate: (frames, caption, width) =>
      animatedBoardImage(drawing, frames.map(f => ({ props: site.props(f.board), ms: f.ms })), caption, width),
    caption: site.caption,
    name: site.name,
    copy: copyPng,
    download: (name, file) => download(name, file, file.type),
  };
}

type Drawing<P extends Record<string, any>> = { Board: Component<P>; svg: BoardSvg; site: string };

/** The PNG of a board drawn with `props`, `width` pixels wide, and under it the caption's lines (the first in bold)
 *  and the site's name, small. */
async function boardImage<P extends Record<string, any>>(drawing: Drawing<P>, props: P, caption: string[],
                                                             width: number): Promise<Blob> {
  return pngOf(await boardCanvas(styledBoard(drawing, props, width), caption, width, drawing.site));
}

/** An animated GIF (gif.ts) of boards, each drawn as boardImage draws it, with the same caption, and shown for its
 *  `ms`. It plays again with no end. After the first frame, a frame holds only the part of the image that changed, and
 *  a frame that changes nothing adds its time to the frame before it. The board's and the caption's colours (FLAT)
 *  stay exact in the GIF's 256 colours. A change of theme between two frames starts the image again, in the new
 *  theme. */
async function animatedBoardImage<P extends Record<string, any>>(drawing: Drawing<P>,
  frames: { props: P; ms: number }[], caption: string[], width: number): Promise<Blob> {
  let gif: Uint8Array<ArrayBuffer> | null;
  do gif = await gifInOneTheme(drawing, frames, caption, width); while (!gif);
  return new Blob([gif], { type: "image/gif" });
}

/** The theme that the page shows now: the root's data-theme, "light" or "dark" (@abstractclass/site/theme.svelte.ts). */
const pageTheme = () => document.documentElement.dataset.theme;

/** The GIF of animatedBoardImage, or null where the page's theme changed between two of its frames. Each frame's board
 *  is styled just before it is drawn, in the same task as the check of the theme. So one board's SVG waits at a time,
 *  and the page can answer the player between two frames. */
async function gifInOneTheme<P extends Record<string, any>>(drawing: Drawing<P>, frames: { props: P; ms: number }[],
                                                                caption: string[], width: number):
  Promise<Uint8Array<ArrayBuffer> | null> {
  const theme = pageTheme(), out: GifFrame[] = [];
  let before: Uint8ClampedArray | null = null, fixed: number[] = [];
  for (const { props, ms } of frames) {
    if (pageTheme() !== theme) return null;
    const board = styledBoard(drawing, props, width);
    const canvas = await boardCanvas(board, caption, width, drawing.site), { width: w, height: h } = canvas;
    const now = canvas.getContext("2d")!.getImageData(0, 0, w, h).data;
    if (!before) fixed = Object.values(board.colour).map(rgbOf);
    addFrame(out, before, now, w, h, ms);
    before = now;
  }
  return animatedGif(out, fixed);
}

/** The tokens whose colours the image fills flat areas with: the board, its dots, the players'
 *  colours, the numbers on the line's badges, and the caption's background and text. */
const FLAT = ["board-bg", "board-dot", "blue", "red", "on-badge", "panel", "text", "muted"] as const;

const pngOf = (canvas: HTMLCanvasElement) => new Promise<Blob>((done, fail) =>
  canvas.toBlob(b => (b ? done(b) : fail(new Error("the browser made no image"))), "image/png"));

/** A board's SVG with its styles written in, its height in pixels, and the colours of FLAT, read in one theme. */
type StyledBoard = { markup: string; height: number; colour: Record<(typeof FLAT)[number], string> };

/** A board drawn with `props` apart from the page: its SVG `width` pixels wide with its styles written in (the site's
 *  BoardSvg), and the colours of FLAT, as CSS gives them in the page's theme now. It runs in one task. The host sets
 *  no theme of its own: it takes the page's tokens (data-theme on the root, theme.svelte.ts), and Tailwind's dark:
 *  variant reads the root's data-theme too. */
function styledBoard<P extends Record<string, any>>({ Board, svg }: Drawing<P>, props: P, width: number):
  StyledBoard {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.className = "fixed top-0 -left-[100000px] w-[600px] pointer-events-none";
  document.body.append(host);
  const board = mount(Board, { target: host, props });
  try {
    flushSync();
    const { markup, height } = svg(host, width);
    // Read now: a computed style is live, and empty once the host leaves the page.
    const css = getComputedStyle(host);
    const colour = Object.fromEntries(FLAT.map(name => [name, css.getPropertyValue(`--${name}`).trim()])) as
      StyledBoard["colour"];
    return { markup, height, colour };
  } finally {
    void unmount(board);
    host.remove();
  }
}

/** The caption's place under a board `board` pixels high in an image `width` pixels wide, for `lines` lines whose
 *  widest is `widest` times its font's size: the padding, the lines' font size, the site's name's size, the distance
 *  from one line to the next, and the image's height. The lines take 2.2% of the width (26 pixels in an image 1,200
 *  wide), less where the widest line would not fit, and the site's name three quarters of that. */
export function captionLayout(width: number, board: number, lines: number, widest: number):
  { pad: number; size: number; small: number; lead: number; height: number } {
  const pad = Math.round(0.03 * width);
  const size = Math.min(0.022 * width, (width - 2 * pad) / widest), small = 0.75 * size, lead = 1.45 * size;
  return { pad, size, small, lead, height: Math.ceil(board + pad + lines * lead + 1.4 * small + pad) };
}

/** The canvas of boardImage: the board `styledBoard` gave, with the caption and the site's name `site` under it in the
 *  board's colours. */
async function boardCanvas({ markup, height, colour }: StyledBoard, caption: string[], width: number, site: string):
  Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  const img = new Image();
  img.src = url;
  try { await img.decode(); } finally { URL.revokeObjectURL(url); }

  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d")!;
  const fonts = "system-ui, sans-serif";
  ctx.font = `600 100px ${fonts}`;
  const widest = Math.max(...caption.map(t => ctx.measureText(t).width / 100));
  const { pad, size, small, lead, height: total } = captionLayout(width, height, caption.length, widest);
  canvas.width = width;
  canvas.height = total;
  ctx.fillStyle = colour.panel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, width, height);
  ctx.textBaseline = "top";
  let y = height + pad;
  caption.forEach((text, i) => {
    ctx.font = `${i === 0 ? 600 : 400} ${size}px ${fonts}`;
    ctx.fillStyle = colour.text;
    ctx.fillText(text, pad, y);
    y += lead;
  });
  ctx.font = `400 ${small}px ${fonts}`;
  ctx.fillStyle = colour.muted;
  ctx.fillText(site, pad, y + 0.3 * small);
  return canvas;
}

/** A CSS colour as 0xRRGGBB, as a canvas draws it. */
function rgbOf(css: string): number {
  const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d")!;
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return (r << 16) | (g << 8) | b;
}

/** Puts a PNG on the clipboard (a ClipboardItem: Chrome, Edge, Safari, Firefox 127 and later). The image is given as a
 *  promise, so that the write starts within the player's click, as Safari asks. False where the browser refuses an
 *  image, once the image is made. An image that fails throws its own error. */
export async function copyPng(png: Promise<Blob>): Promise<boolean> {
  let copied = false;
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
      copied = true;
    } catch {} // refused: the image's own error, if any, comes from `png` below
  }
  await png;
  return copied;
}
