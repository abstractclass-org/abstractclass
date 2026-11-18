/** A pointer handler that acts only for a mouse (design 07, item 14). A touch screen has no hover (design 33, item 6),
 *  and a pen counts as a touch (item 8): after a touch's release a browser sends its `mouseenter` or `mousemove`, and
 *  no `mouseleave` until the next touch elsewhere, which would leave a preview, a line, a popup or a tooltip on screen.
 *  The touch's own pointer events end with it (`pointerleave` comes at its release), and the handler ignores them.
 *  A hover listens to `pointerenter`, `pointermove` and `pointerleave` through this, never to the mouse events. */
export const byMouse = <E extends PointerEvent>(act: (ev: E) => void) => (ev: E) => { if (ev.pointerType === "mouse") act(ev); };
