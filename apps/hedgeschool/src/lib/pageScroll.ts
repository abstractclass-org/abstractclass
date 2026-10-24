// The page's scroll (+layout.svelte): on a screen with a mouse, the page scrolls in its own area under the site's header
// (#page), which stays in view and reaches the window's edges, while the scroll bar's room stays on every page. On a
// touch screen, the document scrolls, as it does by default. Code that needs the page's scroll reads it here.

/** The element that scrolls the page on a screen with a mouse. */
export const pageArea = () => document.getElementById("page");

/** How far the page is scrolled down, in either form: the area's offset and the window's, one of them 0. */
export const pageScrollTop = () => (pageArea()?.scrollTop ?? 0) + window.scrollY;

/** An attachment for what a button in the step bar opens in the page (the display settings, Practice's question): it
 *  brings the element into view as it shows. On a phone the bar is fixed to the bottom of the window (StepBar), so what
 *  it opens can be out of view, under the board. At the nearest edge, clear of the bar (its scroll padding, app.css): an
 *  element already in view does not move. */
export const intoView = (element: HTMLElement) => element.scrollIntoView({ block: "nearest" });
