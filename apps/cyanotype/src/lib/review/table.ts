// The analysis table's names on Cyanotype (blueprintsView.ts: `nameText` and `fitName`).

/** The least size of a candidate's name in the table, as a share of its full size: below it, the name is cut, fades
 *  at its end, and the Move header can show it in full. At 65% (9 pixels in the table's 14), the longest edit of the
 *  strategyjam.org archive (17 characters) fits as text in the cell of a window 1,376 pixels wide: 142.8 pixels at full
 *  size in 93 pixels of room, measured in Chromium. Its glyphs would need 54% (7.6 pixels), too small to read. */
export const NAME_LEAST = 0.65;
