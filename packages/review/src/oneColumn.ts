// The pages' one column (design 06): below 800 pixels (Lichess's $small), the board as wide as the window, and the
// side column under it. The review's styles (review.css: the `one-column` variant and the fixed step bar, and the
// `one-column-layout` variant of Practice's frame) take the same query, so that they agree at a fractional width
// between 799 and 800 pixels, as a browser's zoom gives it. A script that must know it reads this query.
export const ONE_COLUMN = "(max-width: 799px)";
