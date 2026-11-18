/** A pointer handler that acts only for a mouse (design 07, item 14). After a touch's release a browser sends its
 *  `mouseenter` or `mousemove`, and no `mouseleave` until the next touch elsewhere, which would leave a hover on
 *  screen. A pen counts as a touch (design 33, item 8). */
export const byMouse = (act: (ev: PointerEvent) => void) => (ev: PointerEvent) => { if (ev.pointerType === "mouse") act(ev); };
