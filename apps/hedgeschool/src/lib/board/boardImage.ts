// The board as a PNG (design 07, item 17), in the player's browser, with no server: the board's SVG (Board.svelte),
// drawn apart from the page in the light theme, with its computed colours and fonts written into each element, then
// drawn on a canvas with a caption under it. The animated image of a line is a GIF of such canvases (gif.ts). Lichess
// renders its board images on its server, from the position's FEN. Images always have the light look: an image leaves
// the site, for chats and forums of either background and for print, and one look makes the images of a line alike
// whoever made them (decisions/product.md, "An image of a line").
import { flushSync, mount, unmount, type ComponentProps } from "svelte";
import { SITE_NAME } from "#lib/edition.ts";
import { animatedGif, changedBox, type GifFrame } from "./gif.ts";
import Board from "./Board.svelte";

type BoardProps = ComponentProps<typeof Board>;

/** The properties that Board.svelte's style sets on its elements, written into the copy: the image has no stylesheet.
 *  The copy keeps the elements' own attributes (fill-rule, stroke-linejoin). */
const STYLED = ["visibility", "opacity", "fill", "fill-opacity", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap",
                "stroke-opacity", "font-family", "font-size", "font-weight", "text-anchor"];

/** A copy of the SVG with each element's computed style in its own style attribute, `size` pixels square. */
function standalone(svg: SVGSVGElement, size: number): string {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const from = [svg, ...svg.querySelectorAll("*")], to = [copy, ...copy.querySelectorAll("*")];
  from.forEach((el, i) => {
    const css = getComputedStyle(el);
    to[i].setAttribute("style", STYLED.map(p => `${p}:${css.getPropertyValue(p)}`).join(";"));
    to[i].removeAttribute("class");
  });
  copy.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  copy.setAttribute("width", `${size}`);
  copy.setAttribute("height", `${size}`);
  return new XMLSerializer().serializeToString(copy);
}

/** The PNG of a board drawn with `props`, `width` pixels wide, and under it the caption's lines (the first in bold)
 *  and the site's name, small. */
export async function boardImage(props: BoardProps, caption: string[], width: number): Promise<Blob> {
  return pngOf((await boardCanvas(props, caption, width)).canvas);
}

/** An animated GIF (gif.ts) of boards, each drawn as boardImage draws it, with the same caption, and shown for its
 *  `ms`. It plays again with no end. After the first frame, a frame holds only the part of the image that changed, and
 *  a frame that changes nothing adds its time to the frame before it. The board's and the caption's colours (FLAT)
 *  stay exact in the GIF's 256 colours. */
export async function animatedBoardImage(frames: { props: BoardProps; ms: number }[], caption: string[], width: number):
  Promise<Blob> {
  const out: GifFrame[] = [];
  let before: Uint8ClampedArray | null = null, fixed: number[] = [];
  for (const { props, ms } of frames) {
    const { canvas, colour } = await boardCanvas(props, caption, width), { width: w, height: h } = canvas;
    const ctx = canvas.getContext("2d")!, now = ctx.getImageData(0, 0, w, h).data;
    if (!before) {
      fixed = Object.values(colour).map(rgbOf);
      out.push({ rgba: now, x: 0, y: 0, w, h, ms });
    } else {
      const box = changedBox(before, now, w, h);
      if (box) out.push({ rgba: ctx.getImageData(box.x, box.y, box.w, box.h).data, ...box, ms });
      else out[out.length - 1].ms += ms;
    }
    before = now;
  }
  return new Blob([animatedGif(out, fixed)], { type: "image/gif" });
}

/** The tokens of the light theme whose colours the image fills flat areas with: the board, its dots, the players'
 *  colours, the numbers on the line's badges, and the caption's background and text. */
const FLAT = ["board-bg", "board-dot", "blue", "red", "on-badge", "panel", "text", "muted"] as const;

const pngOf = (canvas: HTMLCanvasElement) => new Promise<Blob>((done, fail) =>
  canvas.toBlob(b => (b ? done(b) : fail(new Error("the browser made no image"))), "image/png"));

/** The canvas of boardImage, and the light theme's colours of FLAT, as CSS gives them. */
async function boardCanvas(props: BoardProps, caption: string[], width: number):
  Promise<{ canvas: HTMLCanvasElement; colour: Record<(typeof FLAT)[number], string> }> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.dataset.theme = "light"; // the light theme's colours (app.css)
  host.className = "fixed top-0 -left-[100000px] w-[600px] pointer-events-none";
  document.body.append(host);
  let markup: string, colour: Record<(typeof FLAT)[number], string>;
  const board = mount(Board, { target: host, props });
  try {
    flushSync();
    markup = standalone(host.querySelector("svg")!, width);
    // Read now: a computed style is live, and empty once the host leaves the page.
    const css = getComputedStyle(host);
    colour = Object.fromEntries(FLAT.map(name => [name, css.getPropertyValue(`--${name}`).trim()])) as typeof colour;
  } finally {
    void unmount(board);
    host.remove();
  }
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
  const img = new Image();
  img.src = url;
  try { await img.decode(); } finally { URL.revokeObjectURL(url); }

  // The caption: its lines at 2.2% of the width (26 pixels in an image 1,200 wide), smaller where the widest line
  // would not fit, and the site's name at three quarters of that.
  const canvas = document.createElement("canvas"), ctx = canvas.getContext("2d")!;
  const pad = Math.round(0.03 * width), fonts = "system-ui, sans-serif";
  ctx.font = `600 100px ${fonts}`;
  const widest = Math.max(...caption.map(t => ctx.measureText(t).width / 100));
  const size = Math.min(0.022 * width, (width - 2 * pad) / widest), small = 0.75 * size, lead = 1.45 * size;
  canvas.width = width;
  canvas.height = Math.ceil(width + pad + caption.length * lead + 1.4 * small + pad);
  ctx.fillStyle = colour.panel;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, width, width);
  ctx.textBaseline = "top";
  let y = width + pad;
  caption.forEach((text, i) => {
    ctx.font = `${i === 0 ? 600 : 400} ${size}px ${fonts}`;
    ctx.fillStyle = colour.text;
    ctx.fillText(text, pad, y);
    y += lead;
  });
  ctx.font = `400 ${small}px ${fonts}`;
  ctx.fillStyle = colour.muted;
  ctx.fillText(SITE_NAME, pad, y + 0.3 * small);
  return { canvas, colour };
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
