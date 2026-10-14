# The logo, the mascot and the colour: a Border Collie, and lavender

**Status:** in force, built. **Decided:** 2026-10-12.

## Context

Hedge School needs a logo for its header and a favicon for the browser's tab, which shows it at 16 pixels. It also
needs a colour of its own: partner sites show buttons that lead to it (design 18), and their default style makes the
school's colour seen beyond the site.

## Decision

1. **A Border Collie is the school's mascot and its logo.** Collies herd sheep into pens, and pens are what Enclosure
   is about. The collie is the schoolmaster of the hedge school.
2. **The head and chest in profile, in black and white, without colour,** as Lichess draws its knight: one of ten
   drawings made with an image generator to a brief modelled on Lichess's knight, chosen and then traced
   to vector paths (potrace, from PNGs of 1,254 pixels) in `src/lib/collie.ts`. The coat is black, with a black patch
   round the eye. The muzzle, the blaze, the cheek and the ruff are white. One ear stands and one tips.
   - **Two drawings of the one dog, by size,** as a type has optical sizes: the full drawing from 48 pixels up (the
     About page), and below that the head alone, made from the full drawing for 16 to 32 pixels (the header, the
     favicon, the iOS icon): no chest, no eye and no fur notches, three broad masses (the black head, the white blaze
     into the muzzle, a small white chin) and a thick white outline, about 6% of its width. The same in both colour
     schemes: the outline keeps the black head clear on a dark page, and on a light page it merges with the page.
3. **In both colour schemes, never as a negative:** on a light page the coat takes the text's colour (`fill-ink`) and
   the white fur is the page. On a dark page the coat stays near-black (#0b0c0e) and the fur off-white (#f2f2f2), with a
   light keyline (#c9cacd) round the whole dog, so that the black coat shows on the dark page. The dark form follows a
   dark edit of the same drawing. The header shows the head at 28 pixels beside the site's name, which is larger than
   the other links (`text-xl`). The header's reserved height (`--site-header`, which the review sizes its board from) is
   3 rem.
4. **The mascot** on the About page ("The schoolmaster": "The school is kept by a Border Collie.") is the full drawing
   at 96 pixels. The earlier mortarboard is not redrawn for this drawing.
5. **The favicon:** the head as a file (`src/lib/assets/favicon.svg`), the same in both colour schemes. An ICO file
   at the site's root for browsers without SVG icons and for the clients that ask for `/favicon.ico` without reading
   the page (`static/favicon.ico`: 16, 32 and 48 pixels, drawn by `scripts/favicon.mjs`), as Evil Martians' "How to
   Favicon" advises. A 180-pixel PNG for iOS's home screen (`static/apple-touch-icon.png`): the head on white. iOS rounds the corners itself and fills transparent ones with
   black, so its PNG is a full square.
6. **The head for partner sites' buttons** ([design 18](18-partner-links.md)): the favicon's drawing at a fixed
   address, `/brand/hedge-school.svg` (`static/brand/`), with a comment that gives its terms: unchanged but for its
   size, only in a button or a link to Hedge School. A test (`src/lib/collie.test.ts`) keeps it, and the favicon,
   the same as the head in `collie.ts`, so that a change of the drawing changes all three.
7. **The school's colour is lavender,** the site's accent in both themes and the partners' buttons. The collie stays
   black and white. Each theme has its own lavender, in one hue (256°), as design 03 tunes every colour:
   - **The light theme: `#6f5aa8`,** a muted lavender: 5.2:1 as text on the page, 4.9:1 on the light grey panels, and
     5.7:1 under white text.
   - **The dark theme: `#b8a6e8`,** a pale lavender: 5.9:1 as text on the darkest panel, and 8.2:1 under near-black
     text. Text on the accent takes `--on-accent`: white in the light theme, `#16181c` in the dark.
   - **The partners' buttons:** the pale lavender with near-black text (`#16181c`), and `#c6b8ee` under the pointer.
     One style reads on white, dark and coloured pages alike.
   - **Apart from the labels:** Great's purple (264°) is more saturated, and the accent marks controls (a switch, a
     bar, a chosen option, a link), never a move.
   - **The chart's score line keeps the earlier teal** (`--score`, `#2a7d6f` and `#4fb3a2`). In lavender it looked
     like the area line's magenta.

## Alternatives

- **Colour on a teal tile** (the first drawings: a black-and-white collie with amber eyes on the accent colour):
  the choice went to Lichess's style, without colour.
- **The teal as the school's colour:** it was the first interface's accent, never chosen as the school's, and a green
  "Review" button looks like chess.com's Game Review.
- **Black and white for the partners' buttons,** from the logo: one button for every page, or a pair (black on light
  pages, white on dark pages, as "Sign in with Apple"). The lavender gives the school a colour, and its pale form
  reads on every page with one style. On a black button the collie's coat merges into the button.
- **The face from the front** (a silhouette with the blaze cut out, then a drawing with black patches round the eyes):
  the choice went to a profile, as Lichess's knight. The front view needs both ears and both eyes to read, and gives the
  muzzle no shape.
- **A solid profile silhouette** (the head filled, with the eye, the mouth and the ruff's edge cut out): it read as a
  dog at 16 pixels, but as a wolf: without the white muzzle and ruff it has no collie's markings.
- **Three-quarter view,** with both ears and a blaze between two black patches: a large empty ruff, and the muzzle
  short.
- **Profiles drawn by hand as SVG paths** (a black ear, eye patch and cheek, with the muzzle, blaze and ruff outlined):
  they read as a collie, but stiffly. The generated drawings were better, and tracing keeps them sharp at every size.
- **The other generated drawing kept for its dark form** (version 08, with more fur): it traces to 34 KB of paths
  against 14 KB, and its tufts blur at 16 pixels.
- **The PNGs themselves:** they would not take the page's ink, and 1 MB each.
- **Simplified bust drawings for the small sizes** (the head and chest of drawings 08 and 09 in broad shapes, with a
  thick white border on dark pages): they read at 16 pixels, but the chest took half the icon. The head alone is
  larger at the same size.
- **Line art** (the outline alone, with the blaze as two lines): at 16 pixels the lines merged into a blur, and at large
  sizes the outline read more as a cat's.
- **The mortarboard in the logo,** or a wide one in the mascot: lost at the favicon's size, and a wide cap hid the ear,
  which makes the collie.

## Where it is

- `src/lib/Collie.svelte` (the drawing, with `size` and `label`), `src/lib/collie.ts` (its traced paths),
  `src/lib/assets/favicon.svg`, `static/favicon.ico` (`scripts/favicon.mjs`), `static/apple-touch-icon.png`,
  `static/brand/hedge-school.svg`.
- `src/routes/+layout.svelte` (the icons, the header), `src/routes/about/+page.svelte` (the mascot), `src/app.css`
  (`--site-header`, `--accent`, `--on-accent`, `--score`). The partners' button style:
  `src/routes/developers/+page.svelte`.
- The PNGs were drawn from the SVG by the browser, on a canvas: this machine's ffmpeg cannot read SVG. The tracing
  used the `potrace` package of npm outside the repository: the drawing's dark form split into the dog with its
  keyline, the dog inside it, and the white fur, each traced.

## Log entries

- [decisions/product.md](../decisions/product.md): "The logo: a Border Collie", "The logo in black and white", "The
  logo in profile", "The logo from the generated drawings" (2026-10-12), "The school's colour: lavender" (2026-10-13).
