// The board as a PNG (design 07, item 17), in the player's browser, with no server: the board's SVG (Board.svelte),
// drawn apart from the page in the page's theme, with its computed colours and fonts written into each element, then
// drawn on a canvas with a caption under it. The animated image of a line is a GIF of such canvases (gif.ts). Lichess
// renders its board images on its server, from the position's FEN. An image has the look of the theme that the page
// shows when the player asks for it, light or dark, so that it matches the board on the player's screen
// (decisions/product.md, "An image of a line in the player's theme"). A board's styles are read in one task, and a
// change of theme between two frames of an animated image starts that image again in the new theme: no image mixes
// the two themes.
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
  return pngOf(await boardCanvas(styledBoard(props, width), caption, width));
}

/** An animated GIF (gif.ts) of boards, each drawn as boardImage draws it, with the same caption, and shown for its
 *  `ms`. It plays again with no end. After the first frame, a frame holds only the part of the image that changed, and
 *  a frame that changes nothing adds its time to the frame before it. The board's and the caption's colours (FLAT)
 *  stay exact in the GIF's 256 colours. A change of theme between two frames starts the image again, in the new
 *  theme. */
export async function animatedBoardImage(frames: { props: BoardProps; ms: number }[], caption: string[], width: number):
  Promise<Blob> {
  let gif: Uint8Array<ArrayBuffer> | null;
  do gif = await gifInOneTheme(frames, caption, width); while (!gif);
  return new Blob([gif], { type: "image/gif" });
}

/** The theme that the page shows now: the root's data-theme, "light" or "dark" (theme.svelte.ts). */
const pageTheme = () => document.documentElement.dataset.theme;

/** The GIF of animatedBoardImage, or null where the page's theme changed between two of its frames. Each frame's board
 *  is styled just before it is drawn, in the same task as the check of the theme. So one board's SVG waits at a time,
 *  and the page can answer the player between two frames. */
async function gifInOneTheme(frames: { props: BoardProps; ms: number }[], caption: string[], width: number):
  Promise<Uint8Array<ArrayBuffer> | null> {
  const theme = pageTheme(), out: GifFrame[] = [];
  let before: Uint8ClampedArray | null = null, fixed: number[] = [];
  for (const { props, ms } of frames) {
    if (pageTheme() !== theme) return null;
    const board = styledBoard(props, width);
    const canvas = await boardCanvas(board, caption, width), { width: w, height: h } = canvas;
    const ctx = canvas.getContext("2d")!, now = ctx.getImageData(0, 0, w, h).data;
    if (!before) {
      fixed = Object.values(board.colour).map(rgbOf);
      out.push({ rgba: now, x: 0, y: 0, w, h, ms });
    } else {
      const box = changedBox(before, now, w, h);
      if (box) out.push({ rgba: ctx.getImageData(box.x, box.y, box.w, box.h).data, ...box, ms });
      else out[out.length - 1].ms += ms;
    }
    before = now;
  }
  return animatedGif(out, fixed);
}

/** The tokens whose colours the image fills flat areas with: the board, its dots, the players'
 *  colours, the numbers on the line's badges, and the caption's background and text. */
const FLAT = ["board-bg", "board-dot", "blue", "red", "on-badge", "panel", "text", "muted"] as const;

const pngOf = (canvas: HTMLCanvasElement) => new Promise<Blob>((done, fail) =>
  canvas.toBlob(b => (b ? done(b) : fail(new Error("the browser made no image"))), "image/png"));

/** A board's SVG with its styles written in, and the colours of FLAT, read in one theme. */
type StyledBoard = { markup: string; colour: Record<(typeof FLAT)[number], string> };

/** A board drawn with `props` apart from the page: its SVG `width` pixels square with its styles written in
 *  (standalone), and the colours of FLAT, as CSS gives them in the page's theme now. It runs in one task. The host
 *  sets no theme of its own: it takes the page's tokens (data-theme on the root, theme.svelte.ts), and Tailwind's dark:
 *  variant reads the root's data-theme too. */
function styledBoard(props: BoardProps, width: number): StyledBoard {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.className = "fixed top-0 -left-[100000px] w-[600px] pointer-events-none";
  document.body.append(host);
  const board = mount(Board, { target: host, props });
  try {
    flushSync();
    const markup = standalone(host.querySelector("svg")!, width);
    // Read now: a computed style is live, and empty once the host leaves the page.
    const css = getComputedStyle(host);
    const colour = Object.fromEntries(FLAT.map(name => [name, css.getPropertyValue(`--${name}`).trim()])) as
      StyledBoard["colour"];
    return { markup, colour };
  } finally {
    void unmount(board);
    host.remove();
  }
}

/** The canvas of boardImage: the board `styledBoard` gave, with the caption under it in the board's colours. */
async function boardCanvas({ markup, colour }: StyledBoard, caption: string[], width: number):
  Promise<HTMLCanvasElement> {
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
