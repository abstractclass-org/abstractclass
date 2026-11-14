// Support Us (Hedge School's design 22): the dialog with Ko-fi's tip panel (SupportDialog.svelte), open or not, and its
// opening, which each site counts as `support_open` (Hedge School's design 17, Cyanotype's design 33, "Analytics").
// Each site's root layout makes one. It gives `show` to the header's button (SupportButton.svelte) and to the site's
// menu (SiteMenu.svelte), and `open` to the dialog.

/** Support Us's dialog: open or not, and each opening, counted. */
export class Support {
  open = $state(false);
  #track: (name: string) => void;

  /** `analytics`: the site's (analytics.svelte.ts), which counts the openings. */
  constructor(analytics: { track: (name: string) => void }) {
    this.#track = analytics.track;
  }

  /** Opens the dialog, and counts the opening. */
  show = () => {
    this.open = true;
    this.#track("support_open");
  };
}
