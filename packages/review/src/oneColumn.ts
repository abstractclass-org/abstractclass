// The pages' one column (design 06): below 800 pixels (Lichess's $small), the board as wide as the window, and the
// side column under it. The review's styles (review.css, the `one-column` variant and the fixed step bar) and the
// frames' `max-[800px]` classes take the same width. A script that must know it reads this query.
export const ONE_COLUMN = "(max-width: 799px)";
