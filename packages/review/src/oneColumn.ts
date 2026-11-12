// The pages' one column (design 06): below 800 pixels (Lichess's $small), the board as wide as the window, and the
// side column under it. The styles take the same query, or its negation (`not all and`) for the two columns: the
// review's (ReviewView.svelte), and review.css's (the `one-column` variant and the fixed step bar, and the
// `one-column-layout` variant of Practice's frame). So they agree at a fractional width between 799 and 800 pixels, as
// a browser's zoom gives it: a query of the two columns as `(min-width: 800px)` matches there no more than this one.
// A script that must know it reads this query.
export const ONE_COLUMN = "(max-width: 799px)";
