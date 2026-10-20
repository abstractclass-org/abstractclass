---
name: Abstract Class
description: The front door of abstractclass.org, one calm column of games, each with its site and its board.
colors:
  accent: "#6f5aa8"
  on-accent: "#ffffff"
  bg: "#f6f5f2"
  text: "#24252a"
  muted: "#6a6c73"
  border: "#dddad3"
  blue: "#2f6fde"
  red: "#d2453f"
  board-bg: "#f3ead7"
  board-dot: "#b9ab8d"
  engine: "#1f7a8c"
  on-badge: "#ffffff"
  mistake-fill: "#e07a2e"
  accent-dark: "#b8a6e8"
  on-accent-dark: "#16181c"
  bg-dark: "#1d1e21"
  text-dark: "#e4e4e6"
  muted-dark: "#9a9ca3"
  border-dark: "#3a3d42"
  blue-dark: "#5b8ff0"
  red-dark: "#e8635c"
  board-bg-dark: "#3a362e"
  board-dot-dark: "#6d6555"
  engine-dark: "#2f8fa3"
typography:
  display:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(2.75rem, 2rem + 3vw, 4rem)"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 400
    lineHeight: 1.45
  lede:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  focus: "2px"
  button: "6px"
  board: "8px"
spacing:
  gutter: "1rem"
  intro-gap: "0.75rem"
  entry-block: "2rem"
  entry-gap: "2.5rem"
  entry-gap-stacked: "1.75rem"
  actions-row: "0.75rem"
  actions-column: "1.5rem"
components:
  button-learn:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.button}"
    padding: "0.75rem 1.5rem"
  button-learn-dark:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.on-accent-dark}"
    rounded: "{rounded.button}"
    padding: "0.75rem 1.5rem"
  link-try:
    textColor: "{colors.text}"
  link-site:
    textColor: "{colors.text}"
    typography: "{typography.title}"
  game-name:
    textColor: "{colors.text}"
    typography: "{typography.display}"
  board:
    backgroundColor: "{colors.board-bg}"
    rounded: "{rounded.board}"
    width: "20rem"
---

# Design System: Abstract Class

## Overview

**Creative North Star: "The game first, one column"**

The hub is one calm column of games, one entry for each game. Each entry leads with the game's name, because a player
knows the game before the site. The page refuses the landing-page hero and the row of equal
cards. Its look is Hedge School's look. The hub copies Hedge School's colour tokens (`apps/hedgeschool/src/app.css`)
in the same names, its system sans, its hairlines and its board drawing. A visitor who goes from the hub to a game's
site sees no change of world.

The page is quiet and sparse. Ink on a warm page carries the text. Hairlines separate the entries. Lavender appears
only on the actions, the links and the focus ring. The one moving thing on the page is each game's board, which replays
a real scene edge by edge in CSS. The theme follows the system's colour scheme, because the hub keeps nothing in the
browser.

The page runs under a strict Content Security Policy: no script, no inline style, and only its own files. Every visual
effect is a rule in a stylesheet of the hub's own origin. The board is inline SVG with classes, never `style`
attributes.

**Key Characteristics:**
- One centred column of 47.5rem, with 1rem gutters.
- The game's name is the largest type on the page.
- Hedge School's tokens, light and dark, from `prefers-color-scheme`.
- The board is the only motion, drawn and animated in CSS alone.
- Every entry has the same parts, so a new game is a new list item.

## Colors

A warm off-white page, near-black ink, a muted grey for the second voice, and lavender held back for what the visitor
can act on.

### Primary
- **Abstract Class Lavender** (`accent`, `accent-dark` in the dark scheme): the "Learn" button's fill, the colour of a
  link, the underline of a quiet link under the pointer, the focus ring, and the selection's tint at 32%. It is the
  accent of Abstract Class and of Hedge School. As text on the page it gives 5.2:1, and under white 5.7:1. In the
  dark scheme the pale lavender takes near-black text (`on-accent-dark`) at 8.2:1.

### Neutral
- **Warm Page** (`bg`, `bg-dark`): the page's ground.
- **Ink** (`text`, `text-dark`): headings, the site's name in its link, and the quiet link.
- **Muted Grey** (`muted`, `muted-dark`): the lede, the site line, the description and the footer. It keeps 4.5:1 for
  small text on the page.
- **Hairline** (`border`, `border-dark`): the 1px rules above and below each entry, and the resting underline of a
  quiet link.

### The board's colours
- **Sand Ground** (`board-bg`) and **Lattice Dot** (`board-dot`): the board's surface and its 19 by 19 dots.
- **Blue** and **Red** (`blue`, `red`): the two players' edges and nodes, and their regions at a fill opacity of 0.16.
- **Engine Teal** (`engine`): the engine's better edge and its rank badge.
- **Mistake Orange** (`mistake-fill`): the disc of the Mistake mark. Its glyph and the badge text take `on-badge`.

`style.css` also carries Hedge School's panel token (`--panel`) for parity. The hub draws no panel with it.

### Named Rules
**The Two Values Rule.** Lavender is a custom property, never a literal in a rule, a component or a raster image. A
sibling site takes another accent by a change of two values, `--accent` in the light scheme and in the dark. The one
exception is the tab's icon (`public/icon.svg`): a favicon cannot read the page's tokens, so it writes the light
lavender as a literal, and a change of accent changes it too.

**The Lavender Means Action Rule.** Lavender marks only what the visitor can act on: the button, a link, focus and
selection. Text and surfaces never take it.

**The Same Names Rule.** A colour token on the hub has the name and the value of its Hedge School token. A change to a
shared value starts in Hedge School's `app.css`.

## Typography

**Display Font:** the system sans (`system-ui, -apple-system, "Segoe UI", sans-serif`)
**Body Font:** the same system sans

**Character:** one family in two weights. Hierarchy comes from size, weight and tight tracking on the large lines,
never from a second family. The hub ships no font files.

### Hierarchy
- **Display** (700, `clamp(2.75rem, 2rem + 3vw, 4rem)`, 1.1, -0.03em): the game's name, with balanced wrap. A name of
  two lines keeps its lines apart, as Hedge School's home heading does.
- **Headline** (700, 1.5rem, 1.2, -0.01em): the "Abstract Class" wordmark. On the 404 page it links home in ink.
- **Title** (400, 1.25rem, muted): the site line, "at" and the site's name. The name is an ink link at 600.
- **Lede** (400, 1.0625rem, muted, at most 36rem wide): the organization's one line under the wordmark.
- **Body** (400, 15px, 1.45): the page's base. The description is 1rem, muted, at most 30rem wide, with pretty wrap.
  The button and the quiet link are 1rem.
- **Label** (400, 0.875rem): the footer.

The 404 page's heading is 2.25rem at 700, 1.1, -0.02em.

### Named Rules
**The Game First Rule.** In each entry the game's name is the largest type, and the site's name comes second and
smaller. Nothing sits above the game's name.

## Layout

The page is one centred column. `main` and the footer have a content width of 47.5rem and 1rem gutters
(`box-sizing: content-box`, so the gutters add to the width). The top of `main` has `clamp(2.5rem, 8vh, 6.5rem)` of
space. The intro is a grid with a 0.75rem gap. The list of games starts `clamp(1.75rem, 5vh, 2.75rem)` under it,
under a hairline.

Each entry is a grid of two columns: the board at 20rem, then the text in `minmax(0, 1fr)`, with a 2.5rem gap. The two
columns are centred on each other. The entry has 2rem of space above and below, and a hairline under it. The text
column stacks its parts at the start, with these steps: 0.75rem to the site line, 0.875rem to the description, and
1.375rem to the actions. The actions wrap, with a gap of 0.75rem between rows and 1.5rem between
the two actions.

Below 52rem (a phone, a narrow window or a large zoom), the entry becomes one column: the text first, then the board
under it at most 22.5rem wide, with a 1.75rem gap. Beside the board, the text would narrow to about 18rem there.

### Named Rules
**The New List Item Rule.** A new game is a new `li.game` with the same parts in the same order. The page takes a
second entry, and later more, with no change to the layout.

## Elevation & Depth

The page is flat. No surface has a shadow, and hairlines separate the entries. The only depth is on the board: the
Mistake mark's disc has a small soft drop shadow (an SVG `feDropShadow`, at 0.5 opacity and a blur of 0.033 board
units), as Hedge School draws it. Under a pointer that can hover, the entry under the pointer stays at full opacity,
and the other entries step back to 0.55 in 0.3 s.

### Named Rules
**The Flat Page Rule.** Page elements take no shadow. Depth on the hub belongs to the board's marks only.

## Shapes

The shapes are soft and small. The "Learn" button has 6px corners. The board has 8px corners. The focus ring has 2px
corners. Rules are 1px hairlines. On the board, edges have round caps, nodes are small discs, and the engine's rank
badge is a rounded square.

## Components

### Buttons
- **Character:** one filled button for each entry, and one quiet link beside it.
- **Learn (primary):** "Learn <game>". Lavender fill with `on-accent` text, 1rem at 600, `0.75rem 1.5rem` of padding,
  6px corners and no underline. Under the pointer its brightness rises to 1.1. The 404 page uses the same button to go
  home.
- **Try (quiet link):** "Try a practice game". Ink text with a 1px hairline underline. Under the pointer the underline
  turns lavender.

### Links
- **Default:** lavender, with the underline 0.2em under the text.
- **The site's link:** the site's name in ink at 600, with a hairline underline that turns lavender under the pointer.
  The site's mark sits inside the link, at 1.25em square, before the name. The mark is used only in a link to its own
  site.
- **Focus:** every link shows a 2px solid lavender outline, 3px out from it, with 2px corners.
- **Selection:** text selection takes the accent at 32%, mixed with transparent.

### The game entry (signature component)
The entry is the unit that a new game repeats. Its parts, in order:
1. The game's name, as an `h2` in Display type.
2. The site line: "at", then the site's mark and name in one link.
3. The description: what the game is, then what the site does.
4. The two actions: "Learn <game>" for a player who knows the game, and the quiet link for a newcomer.
5. The board, at the left of the text on a wide screen, and under the text below 52rem.

The hub leaves to each game's site what belongs to the game: the websites where it is played, its credits, and the
site's address in plain text (the link holds it). The footer gives only the hub's own copyright.

### The board (signature component)
- **Drawing:** inline SVG, as Hedge School's `Board.svelte` draws it. A sand ground with 8px corners, a lattice of dots
  from an SVG pattern, blue and red edges with round caps (0.13 board units wide), nodes as discs, and regions at a
  fill opacity of 0.16. The engine's better edge is teal (0.17 wide), with a rank badge. The Mistake mark is an orange
  disc with its glyph drawn as SVG paths. The badges are 1.4 times Hedge School's size, so that the review's moment
  reads at 320 pixels.
- **Source:** `scripts/enclosure-board.mjs` writes the board into `index.html` and its animation into
  `enclosure-board.css`. Edit the script, never its outputs.
- **Motion grammar:** a scene of 32 s, which repeats. After 2 s, one edge comes each 1.3 s. An edge draws from one end
  to the other in 0.35 s by its dash offset. A node, a region or a mark fades in over 0.4 s. All of these use the
  ease-out `cubic-bezier(0.16, 1, 0.3, 1)`. The last edge comes 2.6 s after the edge before it. Then the engine's
  better edge appears, then the Mistake mark, and the moment holds. In the last 0.8 s the scene fades out and starts
  again.
- **Pause:** while the pointer is on the board, its animation stops.
- **Reduced motion:** with `prefers-reduced-motion: reduce`, the board has no animation. It shows the scene's last
  moment, still, and hides the elements that leave the scene.
- **Name:** the SVG has `role="img"` and an `aria-label` that tells the scene.

### Named Rules
**The CSS Only Rule.** Motion and state are CSS: keyframes, `:hover`, `:has()` and media queries. The page has no
script, no inline style and no file from another host. A new effect that needs one of these does not ship.

## Do's and Don'ts

### Do:
- **Do** take every colour from a custom property in `style.css`, with its Hedge School name and value.
- **Do** give each new game a new list item with the same six parts in the same order.
- **Do** keep the game's name in Display type (`clamp(2.75rem, 2rem + 3vw, 4rem)`, 700) as the largest type in its
  entry.
- **Do** keep lavender on the actions, links, focus and selection only.
- **Do** give every animation a still state under `prefers-reduced-motion: reduce`.
- **Do** keep text contrast at 4.5:1 or more in both colour schemes.

### Don't:
- **Don't** write lavender as a literal in a rule or a component, or draw it into a raster image.
- **Don't** add a script, an inline `style` attribute, a web font or a file from another host. The Content Security
  Policy refuses them.
- **Don't** put a line of small text above the game's name. The places where a game is played go in its description.
- **Don't** add a landing-page hero or a row of equal cards.
- **Don't** add a shadow to a page element.
- **Don't** show a site's mark anywhere but in a link to that site.
- **Don't** use a programmer's pun on the name: no code braces and no monospace jokes.
