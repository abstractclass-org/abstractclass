<script lang="ts" module>
  import type { Label } from "@abstractclass/analysis/labels.ts";
  import type { AreaMark } from "@abstractclass/review/ownership.ts";
  import type { BrushKeys } from "@abstractclass/review/notes.ts";
  import type { BlueprintInput } from "./blueprintInput.svelte.ts";
  import type { Hex } from "./hex.ts";
  import type { BoardMove, Hand as HandOf, HandHex, Player, SitePosition } from "./position.ts";

  /** An engine candidate: its name (the move's string, its one spelling), its rank (1 is the engine's first choice),
   *  and a note shown on hover. */
  export interface BoardCandidate { name: string; move: BoardMove; rank: number; note: string }
  /** A move of the engine's line from the position, with its mover (in the move), and, once the engine's rules have
   *  played it, the hands after it: the board shows the hands after the line's last move drawn. */
  export interface BoardLineMove { move: BoardMove; hands?: readonly [HandOf, HandOf] }
  export interface BoardLayers { candidates: boolean; grid: boolean }
  export const DEFAULT_LAYERS: BoardLayers = { candidates: true, grid: true };
  /** A hex under the pointer: of the board (`hand` null), or of a blueprint's frame. */
  export type BoardHex = { hand: null; hex: Hex } | { hand: { player: Player } & HandHex; hex: Hex };
  /** A quality label on a move of the turn just played (the review's marks), with its note: a placement's on the
   *  board, an edit's in the hand. The move is in the frames of the hands that the board shows. */
  export interface BoardLabel { move: BoardMove; label: Label; note?: string }
  /** A candidate that places a blueprint, and one that edits a blueprint. */
  type Placement = BoardCandidate & { move: Extract<BoardMove, { type: "place" }> };
  type Edit = BoardCandidate & { move: Extract<BoardMove, { type: "edit" }> };
  /** Cyanotype's keys for the notes' colours (design 33, "The player's notes"): Ctrl for yellow, Alt for green,
   *  both for grey. Shift chooses no colour here: with the right button, it marks each hex that a drag goes across. */
  export const NOTE_KEYS: BrushKeys = [["purple", []], ["yellow", [["Ctrl"]]], ["green", [["Alt"]]], ["grey", [["Ctrl"], ["Alt"]]]];
</script>

<script lang="ts">
  // Blueprints' board (docs/design/33-cyanotype.md), in Hedge School's style: the cells on an unbounded grid of
  // hexes, each player's hand beside it, the last move, the engine's candidates (each placement's candidate outline
  // with its rank, and the rank chips in the hands), and the engine's line numbered from the candidate (design 07). The
  // grid has no edge, so the board pans, zooms and fits the cells. It fills the area that the page gives it (design
  // 06): the hands go in a column on each side of a wide area, Blue's on the left as Blue's cells start on the left,
  // and in a row above and below a tall one (a phone). Geometry only: a placement's footprint and its captured cells
  // come from the move's data. The player's own moves (`input`, design 33, "How the board takes a move"): the chosen
  // blueprint's anchor hexes marked with dots, its footprint under a mouse's pointer (faded in the mover's colour on a
  // marked hex, an outline on another) or on the hex that a tap shows, and the clicks on the board and in the hands.
  import Cell from "./Cell.svelte";
  import Hand, { blueprintBoxes, fitUnit, type HandInput, type HandMarks } from "./Hand.svelte";
  import { moveName } from "../game/notation.ts";
  import { clickBoard, clickHand, handHexOf, tapHex } from "./input.ts";
  import { arrowPath, boxOf, center, fromMiddle, GRID_TILE, GRID_TILE_PATH, hexAt, hexesAlong, hexKey, hexPath, outlinePath,
    sameHex } from "./hex.ts";
  import { cellsOf, footprintOf, PLAYER_NAMES, sameHandHex } from "./position.ts";
  import { untrack, type Snippet } from "svelte";
  import LabelMark from "@abstractclass/review/LabelMark.svelte";
  import { signInk } from "@abstractclass/review/ownership.ts";
  import { brushFor, drawnNote, ringed, ringPoints, sameEndpoints, toggleNote, type BoardNote, type NoteBrush }
    from "@abstractclass/review/notes.ts";
  import { viewHexes } from "../review/blueprintsMap.ts";
  import { clamp, fit, fitAround, pan, pinch, toArea, toPlane, viewBox, zoomAt, type Rect, type Size, type View } from "./view.ts";
  import { FIELD_GAP, FIRST_PLACE, FIRST_SIZE, fitWithPanel, handleSide, handsOf, HANDS_GAP, PANEL_GRIP, PANEL_PAD, panelRect,
           panelSizeIn, placeAt, resized, UNDER_HAND, ZOOM_BUTTONS, ZOOM_WIDTH,
           type PanelPlace } from "./panel.ts";

  interface Props {
    position: SitePosition;
    last?: BoardMove | null; // the move that led to the position
    earlier?: BoardMove[]; // the moves of the same turn before it: marked as it is, so that the turn's moves show together
    candidates?: BoardCandidate[];
    // The candidate pointed at from outside the board (a row of the review's table), or else the pinned one, whose line
    // the page keeps drawn after a click: the board lights it, as it lights the candidate under its own pointer (the
    // review's board seam, @abstractclass/review/game.ts)
    pointed?: string | null;
    line?: BoardLineMove[] | null; // the line of the candidate pointed at or pinned, as far as drawn: the candidate first
    layers?: Partial<BoardLayers>; // the layers that differ from DEFAULT_LAYERS
    oncandidate?: (name: string | null) => void;
    oncandidateclick?: (name: string) => void;
    // The hex under a mouse's pointer, or null when it leaves: the board shows its coordinates, and the page may too.
    onhexat?: (at: BoardHex | null) => void;
    input?: BlueprintInput | null; // the player's own moves
    inputOn?: boolean; // the page lets the board take them: no preview shows (the board also needs the input's rules)
    // Where the hands go: beside the field in its area ("box"), in a panel over the field that the player can drag
    // ("panel"), or under the field, Blue's above Red's ("under")
    hands?: "box" | "panel" | "under";
    // The panel's place, which a drag and a fit change, and its size, which its handle changes: the page keeps them
    place?: PanelPlace;
    size?: Size;
    labels?: BoardLabel[]; // the quality labels of the turn just played (the review's)
    // The area map (design 30), by the index of the map's view (review/blueprintsMap.ts), and the map that it comes
    // from, which holds the view's place: a hex outside the view gets no mark
    areaMap?: (AreaMark | null)[] | null;
    areaOf?: number[] | null;
    // Controls in a strip along the field's foot, left of the zoom's buttons, which the hands' panel keeps off: the
    // review's area map's switch and legend
    controls?: Snippet;
    notes?: BoardNote[]; // the player's notes on this position, at hexes of the board
    onnotes?: (notes: BoardNote[]) => void; // a note drawn, changed or removed, or all cleared: notes work only with it
    // A picture (the home page's): the field takes no pointer, no wheel and no touch, and has no zoom buttons, so that
    // the page scrolls over it. It keeps the fit.
    still?: boolean;
    // The board editor's clicks (Hedge School's design 21, item 10): a click of either button on a hex of the board,
    // and a click on a hex of a blueprint's frame. With it, a click finds no candidate and makes no move, and the right
    // button draws no note: the editor has no notes, as Hedge School's has none. A drag still pans. A click on the board
    // keeps the view as it is, as a pan does, so that the next click finds its hex where it was.
    onedit?: (at: BoardHex, how: { right: boolean }) => void;
    chosen?: ({ player: Player } & HandHex) | null; // the editor's chosen cell in a hand, ringed as the input rings one
    // The board editor's drag with Shift (design 33, "The board editor"): each hex of the board that the drag passes, in
    // order, as the pointer reaches it (`first` for the drag's first hex), then the drag's end. The right button's drag
    // is the other player's, as its click is. Off the board on screen (outside the field, or under the hands' panel),
    // the drag takes no hex. It keeps the view: it does not pan.
    onpaint?: (hex: Hex, how: { right: boolean; first: boolean }) => void;
    onpaintend?: () => void;
    // Hexes to point at, drawn as a soft glow over the cells: the board editor's hexes that the engine's reasons name
    // when no game reaches the position, as Hedge School's board makes the reasons' edges glow (its design 21, item 10)
    targets?: Hex[];
    // A board for an image (the image of a line, board/image.ts): this area, given and not measured, so that the board
    // draws in the task that mounts it. The fit holds the line's placements too, so that the image shows each one.
    image?: Size | null;
  }
  let {
    position, last = null, earlier = [], candidates = [], pointed = null, line = null, layers: layersSet = {},
    oncandidate, oncandidateclick, onhexat, input = null, inputOn = true, hands: handsForm = "box",
    place = $bindable(FIRST_PLACE), size = $bindable(FIRST_SIZE), labels = [], areaMap = null, areaOf = null, controls,
    notes = [], onnotes, still = false, onedit, chosen = null, onpaint, onpaintend, targets = [], image = null,
  }: Props = $props();
  const layers = $derived({ ...DEFAULT_LAYERS, ...layersSet });

  const uid = $props.id();
  const gridId = `${uid}-grid`, lastId = `${uid}-last`, shadowId = `${uid}-shadow`;
  const markId = (kind: "close" | "lose", side: Player) => `${uid}-${kind}-${side}`; // a map mark's pattern
  const players = [0, 1] as const;

  // The layout: the area's size, and the hands' column (a wide area, 1.25 times as wide as high) or row (a tall one).
  // The hands take a share of the area, within limits in pixels. These are the board's own values, checked on the lab
  // page at 360, 800 and 1,400 pixels wide: on a phone, columns would leave the field half its width (design 33). In
  // the panel, each hand is a row that the panel's size sets (panel.ts). Under the field, each hand is a row as wide as
  // the area, and a third of that high at most.
  let measuredWidth = $state(0), measuredHeight = $state(0);
  const width = $derived(image?.width ?? measuredWidth), height = $derived(image?.height ?? measuredHeight);
  const sides = $derived(handsForm === "box" && width > 1.25 * height);
  const handSize = $derived(sides ? clamp(width * 0.13, 72, 170)
    : handsForm === "under" ? Math.min(UNDER_HAND.max, width / UNDER_HAND.parts) : clamp(height * 0.17, 52, 120));
  const field = $derived(handsForm === "panel" ? { width, height }
    : sides ? { width: Math.max(0, width - 2 * (handSize + FIELD_GAP)), height }
    : { width, height: Math.max(0, height - 2 * (handSize + FIELD_GAP)) });
  // The field's foot that the panel keeps off: the zoom's buttons (panel.ts, ZOOM_BUTTONS), and with controls the strip
  // that holds them too
  const zoomRect: Rect = $derived.by(() => {
    const { size, inset } = ZOOM_BUTTONS, y = field.height - inset - size, x = field.width - inset - ZOOM_WIDTH;
    return controls ? { x: inset, y, width: field.width - 2 * inset, height: size } : { x, y, width: ZOOM_WIDTH, height: size };
  });
  // The panel's size within its limits in this area, and while the player resizes it, the size that the handle shows.
  let resizeTo = $state<Rect | null>(null);
  const panelSize = $derived(panelSizeIn(size, field, zoomRect));
  const shownPanel = $derived(resizeTo ?? panelSize);
  const handArea = $derived(handsForm === "panel" ? handsOf(shownPanel) : sides ? { width: handSize, height } : { width, height: handSize });
  const direction = $derived(sides ? "column" : "row");

  // The hands shown: the position's, or a line's after its last move drawn. A line's edits are in those hands' frames.
  const drawn = $derived(line ?? []);
  const hands = $derived(drawn.findLast(l => l.hands)?.hands ?? position.blueprints);
  // The candidates show while no line does, so that the board's only numbers are the line's. Their edits are in the
  // position's frames too, and a line shows its own hands.
  const showCandidates = $derived(layers.candidates && !drawn.length);
  // The board's cells, less the ones that the line captures: those are drawn as captured, as the last move's are.
  const allCells = $derived(cellsOf(position));
  const lineCaptured = $derived(drawn.flatMap(l => (l.move.type === "place" ? l.move.captured : [])));
  const cells = $derived.by(() => {
    if (!lineCaptured.length) return allCells;
    const captured = new Set(lineCaptured.map(c => hexKey(c.hex)));
    return allCells.filter(c => !captured.has(hexKey(c.hex)));
  });
  const lastPlace = $derived(last?.type === "place" ? last : null);
  // The placements of the turn so far: the last move's, and an earlier one's of the same turn. Each has the last-move
  // outline. The captured cells are the last move's only, as Hedge School's board shows the last edge's cut alone.
  const turnPlaces = $derived([...earlier, ...(last ? [last] : [])].filter(m => m.type === "place"));

  // The view. It fits the cells (and the cells that the last move captured) in the area, until the player pans or
  // zooms (`manual`), and again after "Show all the cells". With the input's rules, it fits the anchor hexes of every
  // legal placement too, so that each dot is in view: also while the input is off, so that the view stays as it is
  // when the input turns on. A page that sets the rules after the position (the review, when the engine's describe
  // answers) sees the view fit again once, when they come.
  // With the hands' panel, a fit keeps every hex out from under the panel, and may move the panel to the corner where
  // the fit is larger (panel.ts). A drag or a resize of the panel is the player's choice, as a pan or a zoom is: the
  // fits after it (a move, a change of the area's size) keep the panel where it is, and fit as if no panel were there,
  // so a drag never makes the board smaller. "Show all the cells" and a new page fit with the panel again.
  // While a pointer is down on the field, the view keeps its fit (`held`), and it fits again after the release. So the
  // board does not move under a press, as chessground's board never does. The rules can come during a click (the
  // review gets them from the engine), and a new fit then would put another hex under the pointer at the release.
  let manual = $state.raw<View | null>(null);
  let held = $state.raw<View | null>(null);
  let placedByPlayer = $state(false); // the player dragged or resized the panel
  // A board for an image fits the line's placements too, so that the image shows each move that it numbers.
  const lineHexes = $derived(image ? drawn.flatMap(l => (l.move.type === "place" ? l.move.footprint.map(c => c.hex) : [])) : []);
  const fitHexes = $derived([...allCells.map(c => c.hex), ...(lastPlace?.captured ?? []).map(c => c.hex), ...(input?.allAnchors ?? []),
                             ...lineHexes]);
  const fitBox = $derived(boxOf(fitHexes) ?? boxOf([[-2, -2], [2, 2]])!);
  const hasPanel = $derived(handsForm === "panel" && field.width > 0 && field.height > 0);
  // When the cells, the legal moves or the area change, the fit may move the panel to a corner, before the board
  // draws. Not after the player's choice, not in a view that the player panned or zoomed, and not under a press: after
  // its release.
  $effect.pre(() => {
    if (!hasPanel || manual || placedByPlayer || held) return;
    const hexes = fitHexes, area = field;
    untrack(() => {
      const best = fitWithPanel(hexes, area, panelSize, place, zoomRect, 1.2).place;
      if (best !== place) place = best;
    });
  });
  // The panel's rectangle, and its rectangle while the player drags it (`dragAt`) or resizes it (`resizeTo`).
  let dragAt = $state<Rect | null>(null);
  const panelAt = $derived(panelRect(place, field, panelSize, zoomRect));
  const shownAt = $derived(resizeTo ?? dragAt ?? panelAt);
  const fitted = $derived(hasPanel && !placedByPlayer ? fitAround(fitHexes, field, panelAt, 1.2)
                                                      : fit(fitBox, field, 1.2));
  const view = $derived(manual ?? held ?? fitted);
  const vb = $derived(viewBox(view, field));
  /** Shows all the cells: the fit, with the panel again. */
  function fitAll() { manual = null; placedByPlayer = false; }
  // A drag of the panel's top strip moves it, and a drag of its handle resizes it. Each keeps the pointer's offset from
  // where the press began, and sets the place and the size at its end.
  let panelGesture = $state.raw<{ id: number; kind: "move" | "size"; x: number; y: number; from: Rect; side: "left" | "right" } | null>(null);
  function grab(ev: PointerEvent, kind: "move" | "size") {
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    (ev.currentTarget as Element).setPointerCapture(ev.pointerId);
    panelGesture = { id: ev.pointerId, kind, x: ev.clientX, y: ev.clientY, from: panelAt, side: handleSide(panelAt, field) };
    ev.preventDefault();
  }
  function drag(ev: PointerEvent) {
    const g = panelGesture;
    if (g?.id !== ev.pointerId) return;
    const dx = ev.clientX - g.x, dy = ev.clientY - g.y;
    if (g.kind === "size") resizeTo = resized(g.from, g.side, dx, dy, field, zoomRect);
    else dragAt = panelRect(placeAt(g.from.x + dx, g.from.y + dy, field, g.from), field, g.from, zoomRect);
  }
  function drop(ev: PointerEvent) {
    const g = panelGesture;
    if (g?.id !== ev.pointerId) return;
    panelGesture = null;
    const to = resizeTo ?? dragAt;
    if (to) {
      size = { width: to.width, height: to.height };
      place = placeAt(to.x, to.y, field, to);
      placedByPlayer = true;
    }
    dragAt = resizeTo = null;
  }

  // The candidates: the placements, best first, and the edits. Where each placement's rank goes: on its footprint's hex
  // nearest the footprint's middle, or on the next nearest that keeps clear of the better candidates' ranks and anchor
  // hexes, since candidates overlap and the pointer finds a candidate on both. Ranks on two hexes never meet: a rank's
  // square is 1.2 wide and high, and two hexes' centres are √3 apart across, or 1.5 apart up and down.
  const placements = $derived(layers.candidates
    ? candidates.filter((c): c is Placement => c.move.type === "place").toSorted((a, b) => a.rank - b.rank) : []);
  const edits = $derived(layers.candidates ? candidates.filter((c): c is Edit => c.move.type === "edit") : []);
  const rankPlaces = $derived.by(() => {
    const out = new Map<string, Hex>(), taken: Hex[] = [];
    for (const c of placements) {
      const hexes = c.move.footprint.length ? fromMiddle(c.move.footprint.map(s => s.hex)) : [c.move.at];
      const at = hexes.find(h => !taken.some(t => sameHex(t, h))) ?? hexes[0];
      taken.push(at, c.move.at);
      out.set(c.name, at);
    }
    return out;
  });

  // The pointer: the hex under it, on the board or in a hand, and the candidate there, kept by its name, since a search
  // in progress renews the candidates. Another position clears them. The active candidate is the one under the pointer,
  // or else the one that the page points at (`pointed`).
  let hoverHex = $state<Hex | null>(null);
  let handHover = $state<{ player: Player; at: HandHex } | null>(null);
  let hoverName = $state<string | null>(null);
  // The note that the right button draws (the notes, below): its pointer, its colour, its first hex and the hex under
  // the pointer (none off the board on screen). With Shift, the drag's marks instead: whether they clear, and the hexes
  // that the drag went across.
  let sketch = $state.raw<{ id: number; brush: NoteBrush; from: Hex; to: Hex | null; marks: { clear: boolean; hexes: Hex[] } | null }
                          | null>(null);
  let sketchAt: [number, number] | null = null; // the point of the plane where the drag of marks last was on the board
  $effect.pre(() => { void position; hoverHex = null; handHover = null; hoverName = null; sketch = null; });
  const hovered = $derived(layers.candidates && hoverName ? candidates.find(c => c.name === hoverName) ?? null : null);
  const active = $derived(hovered ?? (pointed ? candidates.find(c => c.name === pointed) ?? null : null));
  // While a line shows, the candidates are hidden, and the pointer finds only the active one, so that the candidate
  // whose line it is keeps its hover, as on Hedge School's board.
  const findable = (c: BoardCandidate) => showCandidates || c.name === active?.name;
  // The pointer and a click find a candidate, or else go to the player's own moves (`takes`, below). On the board, a
  // candidate is found unless a move is begun. In a hand, none is found while the input takes moves: a candidate's line
  // would show other hands under the pointer.
  /** The best placement whose anchor hex or whose rank is on a hex of the board. */
  const placementAt = (h: Hex) => begun ? null
    : placements.find(c => findable(c) && (sameHex(c.move.at, h) || sameHex(rankPlaces.get(c.name)!, h))) ?? null;
  /** The candidate whose edit takes a cell from a hex of a hand (where the hand shows its rank) or puts it there. */
  const handCandidate = (player: Player, at: HandHex) => takes ? null
    : edits.find(c => findable(c) && c.move.player === player && (sameHandHex(c.move.from, at) || sameHandHex(c.move.to, at)))
      ?? null;
  function pointAt(next: Hex | null) {
    if (!(next && hoverHex && sameHex(next, hoverHex))) hoverHex = next;
    hoverName = next ? placementAt(next)?.name ?? null : null;
  }
  function handAt(player: Player, at: HandHex | null) {
    handHover = at ? { player, at } : null;
    hoverName = at ? handCandidate(player, at)?.name ?? null : null;
  }
  // The page hears of each change: of the hex, and of the candidate by its name.
  const pointer = $derived<BoardHex | null>(hoverHex ? { hand: null, hex: hoverHex }
    : handHover ? { hand: { player: handHover.player, ...handHover.at }, hex: handHover.at.hex } : null);
  $effect(() => { onhexat?.(pointer); });
  let told: string | null = null; // the candidate last given to oncandidate
  $effect(() => { const name = hovered?.name ?? null; if (name !== told) oncandidate?.((told = name)); });
  // The player's own moves: on while the input has its rules, the page lets it, and no line shows (the line's hands
  // are in other frames than the dots'). While it is on, a click in the mover's hand goes to it, and a click on the
  // board too, unless nothing is begun and the hex is a candidate's.
  const takes = $derived(inputOn && input?.rules && !drawn.length ? input : null);
  const mover = $derived(takes?.rules?.mover ?? null);
  const begun = $derived(takes?.pending ?? null);
  const anchorKeys = $derived(new Set((takes?.anchors ?? []).map(hexKey)));
  // The chosen blueprint's footprint: on the hex that a tap shows, or else under a mouse's pointer.
  const footAt = $derived(begun ? (begun.shown?.type === "place" ? begun.shown.at : hoverHex) : null);
  const foot = $derived(begun && footAt && mover !== null
    ? { at: footAt, cells: footprintOf(position.blueprints[mover][begun.blueprint - 1], footAt), legal: anchorKeys.has(hexKey(footAt)) }
    : null);
  // The move that a mouse's click under the pointer makes, as the input decides it (input.ts).
  const clickMove = $derived(!takes?.legal || !begun ? null
    : hoverHex ? clickBoard(begun, takes.legal, hoverHex, false).move
    : handHover ? clickHand(begun, takes.rules!, takes.legal, handHover.player, handHover.at, false).move
    : null);
  // The editor's hands: both take clicks, and the chosen cell is ringed.
  const editInput = (p: Player): HandInput => ({ blueprint: null, targets: [], ghost: null,
    cell: chosen?.player === p ? { blueprint: chosen.blueprint, hex: chosen.hex } : null });
  const handInput = (p: Player): HandInput | null => onedit ? editInput(p) : !takes || p !== mover ? null : {
    blueprint: begun?.blueprint ?? null,
    cell: begun?.cell ? { blueprint: begun.blueprint, hex: begun.cell } : null,
    targets: takes.targets ?? [],
    ghost: begun?.shown?.type === "edit" ? begun.shown.to : clickMove?.kind === "edit" ? handHexOf(clickMove.to) : null,
  };

  // The move that a click under the pointer makes, or else the coordinates there.
  const readout = $derived(clickMove ? moveName(clickMove)
    : hoverHex ? hexKey(hoverHex)
    : handHover ? `${PLAYER_NAMES[handHover.player]} ${handHover.at.blueprint}:${hexKey(handHover.at.hex)}` : "");

  const lineHasEdit = $derived(drawn.some(l => l.move.type === "edit"));
  // The quality labels of the placements of the turn just played: each at the upper right of its footprint, by the
  // rightmost hex of its top row. Not while a line shows: its moves are the line's.
  const boardLabels = $derived(drawn.length ? [] : labels.flatMap(l => {
    if (l.move.type !== "place" || !l.move.footprint.length) return [];
    const top = Math.min(...l.move.footprint.map(c => c.hex[1]));
    const hex = l.move.footprint.filter(c => c.hex[1] === top).reduce((a, b) => (b.hex[0] > a.hex[0] ? b : a)).hex;
    const [x, y] = center(hex);
    return [{ x: x + 0.75, y: y - 0.55, label: l.label, note: l.note }];
  }));
  // The area map: each marked hex of the map's view, by its index (blueprintsMap.ts).
  const AREA_ALPHA = 0.45; // Hedge School's board's
  const areaHexes = $derived(areaOf ? viewHexes(areaOf) : []);
  const areaMarks = $derived(areaMap ? areaHexes.flatMap((hex, i) => (areaMap![i] ? [{ hex, m: areaMap![i]! }] : [])) : []);
  // The board's cells by hex, for the marks over a cell
  const owners = $derived(new Map(cells.map(c => [hexKey(c.hex), c.owner])));
  const marks = $derived(players.map((p): HandMarks => ({
    // The last move's edit is in the position's frames: a line that edits a hand shows other frames.
    last: last?.type === "edit" && last.player === p && !lineHasEdit ? last : null,
    turn: lineHasEdit ? [] : earlier.flatMap(m => (m.type === "edit" && m.player === p ? [m] : [])),
    candidates: showCandidates ? edits.filter(c => c.move.player === p).map(c => ({ ...c.move, name: c.name, rank: c.rank })) : [],
    placed: showCandidates
      ? placements.filter(c => c.move.player === p).map(c => ({ blueprint: c.move.blueprint, name: c.name, rank: c.rank }))
      : [],
    line: drawn.flatMap((l, i) => l.move.player === p && l.move.type === "edit" ? [{ ...l.move, n: i + 1 }] : []),
    labels: lineHasEdit ? [] : labels.flatMap(l => (l.move.type === "edit" && l.move.player === p ? [{ at: l.move.to, label: l.label, note: l.note }] : [])),
  })));
  const boxes = $derived(players.map(p => blueprintBoxes(hands[p], marks[p])));
  // One scale for the six blueprints: the largest at which each fits its panel, a hex at most 36 pixels across.
  const unit = $derived(Math.max(1, Math.min(18, ...boxes.map(b => fitUnit(handArea, direction, b)))));

  // The pointer on the field. A mouse's drag or one finger pans, two fingers pinch, the wheel zooms round the pointer.
  // A press and release that does not move is a click: on a candidate's hex, it clicks the candidate.
  let el: HTMLDivElement;
  const DRAG_PX = 4; // a press that moves less is a click
  const pointers = new Map<number, { x: number; y: number }>();
  let gesture: { kind: "press"; x: number; y: number; moved: boolean; start: View }
             | { kind: "pinch"; from: { x: number; y: number; d: number }; start: View } | null = null;
  const local = (ev: PointerEvent | WheelEvent) => {
    const r = el.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  };
  const hexUnder = (p: { x: number; y: number }) => hexAt(...toPlane(view, field, p.x, p.y));
  /** Whether a point of the field shows the board: inside the field, and not under the hands' panel. */
  const onBoard = (p: { x: number; y: number }) => p.x >= 0 && p.y >= 0 && p.x < field.width && p.y < field.height
    && !(hasPanel && p.x >= shownAt.x && p.x < shownAt.x + shownAt.width && p.y >= shownAt.y && p.y < shownAt.y + shownAt.height);
  function twoFingers() {
    const [a, b] = [...pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
  }
  // The pointers down on the field. The view holds its fit (`held`) from the first press, and fits again when the last
  // is up. Each press that the field takes captures its pointer, so that its release comes to the field, and a lost
  // capture ends the press as a cancel does.
  const holding = new Set<number>();
  function hold(ev: PointerEvent) {
    try { el.setPointerCapture(ev.pointerId); } catch { return; } // not down any more: no release will come
    if (ev.isPrimary) holding.clear(); // a new press: no other pointer is down, whatever a lost release left
    if (!holding.size) held = fitted;
    holding.add(ev.pointerId);
  }
  let rightPress: { id: number; x: number; y: number } | null = null; // the editor's right button, pressed
  // The editor's Shift drag: its pointer, its button, the point of the plane where it last was on the board, and
  // whether its next hex is its first.
  let stroke: { id: number; right: boolean; at: [number, number] | null; first: boolean } | null = null;
  /** The Shift drag's hexes from its last point on the board to the field's point `p`, as the notes' drag of marks
   *  takes them: a fast drag misses no hex that it crosses. */
  function paintTo(p: { x: number; y: number }) {
    const s = stroke!;
    if (!onBoard(p)) { s.at = null; return; }
    const at = toPlane(view, field, p.x, p.y), hexes = s.at ? hexesAlong(s.at, at) : [hexAt(...at)];
    s.at = at;
    for (const h of hexes) {
      onpaint?.(h, { right: s.right, first: s.first });
      s.first = false;
    }
  }
  /** The editor's click on the board at the field's point `p`: the view stays as it is (a click is no pan). */
  function editAt(p: { x: number; y: number }, right: boolean) {
    if (!onBoard(p)) return;
    manual ??= view;
    onedit?.({ hand: null, hex: hexUnder(p) }, { right });
  }
  // A right press that the field takes (the editor's, the notes'): the browser's menu after it opens nothing, also
  // when the button comes up off the field, where Windows sends the menu's event at the release. A press clears it.
  let menuGuard = false;
  function guardMenu(ev: MouseEvent) {
    if (!menuGuard) return;
    menuGuard = false;
    ev.preventDefault();
  }
  function down(ev: PointerEvent) {
    if (still || (ev.target as Element).closest("button")) return; // the field's buttons take their own clicks
    menuGuard = ev.pointerType === "mouse" && ev.button === 2 && !!(onedit || onnotes);
    if (ev.pointerType === "mouse" && ev.shiftKey && (ev.button === 0 || ev.button === 2) && onpaint) {
      ev.preventDefault();
      hold(ev);
      manual ??= view;
      stroke = { id: ev.pointerId, right: ev.button === 2, at: null, first: true };
      paintTo(local(ev));
      return;
    }
    if (ev.pointerType === "mouse" && ev.button === 2 && onedit) {
      ev.preventDefault();
      hold(ev);
      rightPress = { id: ev.pointerId, ...local(ev) };
      return;
    }
    if (ev.pointerType === "mouse" && ev.button === 2 && onnotes) {
      ev.preventDefault();
      hold(ev);
      const p = local(ev), brush = brushFor(ev, NOTE_KEYS);
      sketchAt = toPlane(view, field, p.x, p.y);
      const h = hexAt(...sketchAt);
      const marks = ev.shiftKey ? { clear: ringed(notes, h, brush), hexes: [h] } : null;
      sketch = { id: ev.pointerId, brush, from: h, to: h, marks };
      return;
    }
    if (ev.pointerType === "mouse" && ev.button !== 0) return;
    hold(ev);
    pointers.set(ev.pointerId, local(ev));
    if (pointers.size === 1) gesture = { kind: "press", ...local(ev), moved: false, start: view };
    else if (pointers.size === 2) gesture = { kind: "pinch", from: twoFingers(), start: view };
  }
  function move(ev: PointerEvent) {
    if (still) return;
    const p = local(ev), at = toPlane(view, field, p.x, p.y), h = hexAt(...at);
    if (ev.pointerType === "mouse") pointAt(h);
    if (stroke?.id === ev.pointerId) { paintTo(p); return; }
    if (sketch?.id === ev.pointerId) {
      // Off the board on screen, the drag takes no hex, and an arrow released there is no note, as chessground drops a
      // shape released off its board.
      const on = onBoard(p);
      if (sketch.marks) {
        // The hexes from the drag's last point to this one: a fast drag skips hexes between two of its moves.
        const { hexes } = sketch.marks;
        const more = (!on ? [] : sketchAt ? hexesAlong(sketchAt, at) : [h]).filter(x => !hexes.some(y => sameHex(x, y)));
        sketchAt = on ? at : null;
        if (more.length) sketch = { ...sketch, marks: { ...sketch.marks, hexes: [...hexes, ...more] } };
      } else if (!on) { if (sketch.to) sketch = { ...sketch, to: null }; }
      else if (!sketch.to || !sameHex(h, sketch.to)) sketch = { ...sketch, to: h };
    }
    if (!pointers.has(ev.pointerId)) return;
    pointers.set(ev.pointerId, p);
    if (gesture?.kind === "pinch" && pointers.size === 2) {
      manual = pinch(gesture.start, field, gesture.from, twoFingers());
    } else if (gesture?.kind === "press") {
      if (!gesture.moved && Math.hypot(p.x - gesture.x, p.y - gesture.y) > DRAG_PX) gesture.moved = true;
      if (gesture.moved) manual = pan(gesture.start, p.x - gesture.x, p.y - gesture.y);
    }
  }
  /** A pointer up, or its press cancelled (`click` false). The press ends first, in the view that it held. Then, with
   *  no pointer down, the view fits again. */
  function up(ev: PointerEvent, click: boolean) {
    end(ev, click);
    if (holding.delete(ev.pointerId) && !holding.size) held = null;
  }
  /** The end of a press: a click, a note, the end of a drag, or nothing when `click` is false. */
  function end(ev: PointerEvent, click: boolean) {
    if (stroke?.id === ev.pointerId) {
      stroke = null;
      onpaintend?.();
      return;
    }
    if (rightPress?.id === ev.pointerId) {
      const p = local(ev), moved = Math.hypot(p.x - rightPress.x, p.y - rightPress.y) > DRAG_PX;
      rightPress = null;
      if (click && !moved) editAt(p, true);
      return;
    }
    if (sketch?.id === ev.pointerId) {
      const next = !click ? notes : sketchNote ? toggleNote(notes, sketchNote, sameEndpoints) : markedNotes ?? notes;
      sketch = null;
      if (next !== notes) onnotes?.(next);
      return;
    }
    if (!pointers.delete(ev.pointerId)) return;
    if (gesture?.kind === "press" && !gesture.moved && click) {
      const p = local(ev), h = hexUnder(p), c = placementAt(h), touch = ev.pointerType !== "mouse";
      if (notes.length) onnotes?.([]);
      if (onedit) editAt(p, false);
      else if (c) oncandidateclick?.(c.name);
      else if (takes) {
        const shown = begun?.shown?.type === "place" && foot ? { at: foot.at, hexes: foot.cells.map(s => s.hex) } : null;
        takes.clickBoard(touch ? tapHex(h, toPlane(view, field, p.x, p.y), shown, takes.anchors ?? []) : h, touch);
      }
    }
    // One finger left of a pinch goes on panning, and is not a click.
    const rest = [...pointers.values()][0];
    gesture = rest ? { kind: "press", ...rest, moved: true, start: view } : null;
  }
  // The wheel zooms by d3-zoom's steps (its defaultWheelDelta, github.com/d3/d3-zoom): a pixel of the wheel is 0.002 of
  // a doubling, a line 0.05 and a page 1, and a touchpad's pinch (the wheel with Ctrl) ten times as much.
  $effect(() => {
    if (still) return;
    const wheel = (ev: WheelEvent) => {
      ev.preventDefault();
      const doublings = -ev.deltaY * (ev.deltaMode === 1 ? 0.05 : ev.deltaMode ? 1 : 0.002) * (ev.ctrlKey ? 10 : 1);
      const p = local(ev);
      manual = zoomAt(view, field, 2 ** doublings, p.x, p.y);
    };
    el.addEventListener("wheel", wheel, { passive: false }); // a passive listener cannot keep the page from scrolling
    return () => el.removeEventListener("wheel", wheel);
  });

  // The player's notes (design 33, "The player's notes", with @abstractclass/review/notes.ts, as Hedge School's board):
  // the right button marks a hex, and a right drag draws an arrow to another hex, as Lichess draws circles and arrows.
  // An arrow keeps its direction, as chessground's shapes do: the other way, it is another arrow (`sameEndpoints`).
  // With Shift, a right drag marks each hex that it goes across, as strategyjam.org's Sandbox does, or clears that
  // colour's marks from them when its first hex has a mark of the colour. The keys held choose the colour (`NOTE_KEYS`).
  // A note is at hexes of the board only. A click on the field clears the position's notes (chessground's
  // eraseOnClick), but a pan or a zoom does not: this board pans, and a pan would lose them.
  // The note being drawn: a marked hex while the pointer has not left its hex, else an arrow. Or the notes with the
  // drag's marks so far.
  const sketchNote = $derived(sketch && !sketch.marks && sketch.to ? drawnNote(sketch.from, sketch.to, sketch.brush) : null);
  const markedNotes = $derived(sketch?.marks ? ringPoints(notes, sketch.marks.hexes, sketch.brush, sketch.marks.clear) : null);
  const shownNotes = $derived(sketchNote ? [...notes, sketchNote] : markedNotes ?? notes);
  const drawing = $derived(sketchNote ? notes.length : -1); // the index of the note being drawn in shownNotes

  /** A note beside a hex, in the area's pixels: on its right, or on its left near the area's right edge. */
  const noteAt = (h: Hex) => {
    const [x, y] = toArea(view, field, ...center(h));
    return { x, y, left: x > field.width * 0.6 };
  };
  // The zoom's buttons: two steps double the scale.
  const zoomBy = (factor: number) => { manual = zoomAt(view, field, factor, field.width / 2, field.height / 2); };
  const TOOL = ["grid size-(--zoom-size) place-items-center rounded-md border border-line bg-panel/90 p-0",
                "text-[17px] leading-none font-semibold hover:bg-panel-2"];
</script>

<!-- A candidate's rank in a rounded square: the engine's line numbers its moves in circles (Go's numbered stones), so
     the candidates take another shape, as on Hedge School's board. -->
{#snippet rankAt(h: Hex, rank: number)}
  {@const [x, y] = center(h)}
  <rect x={x - 0.6} y={y - 0.6} width="1.2" height="1.2" rx="0.28" class="rank" />
  <text {x} y={y + 0.27} class="badge-number">{rank}</text>
{/snippet}

{#snippet handOf(p: Player)}
  <Hand hand={hands[p]} player={p} width={handArea.width} height={handArea.height} {direction} {unit}
        boxes={boxes[p]} marks={marks[p]} input={handInput(p)} hover={handHover?.player === p ? handHover.at : null}
        onhover={at => handAt(p, at)}
        onpick={(at, touch) => {
          if (onedit) { onedit({ hand: { player: p, ...at }, hex: at.hex }, { right: false }); return; }
          const c = handCandidate(p, at);
          if (c) oncandidateclick?.(c.name);
          else takes?.clickHand(p, at, touch);
        }} />
{/snippet}

<svelte:window onpointerdowncapture={() => (menuGuard = false)} oncontextmenu={guardMenu} />

<div class="board {handsForm}" class:sides bind:clientWidth={measuredWidth} bind:clientHeight={measuredHeight}
     style:width={image && `${image.width}px`} style:height={image && `${image.height}px`}
     style:--hand="{handSize}px" style:--gap="{FIELD_GAP}px" style:--zoom-size="{ZOOM_BUTTONS.size}px"
     style:--zoom-gap="{ZOOM_BUTTONS.gap}px" style:--zoom-inset="{ZOOM_BUTTONS.inset}px"
     style:--zoom-room="{4 * ZOOM_BUTTONS.inset + ZOOM_WIDTH}px">
  {#if handsForm !== "panel"}
    {#each players as p (p)}
      <div class="hand-area p{p}">
        {#if width > 0 && height > 0}{@render handOf(p)}{/if}
      </div>
    {/each}
  {:else if field.width > 0 && field.height > 0}
    <!-- The hands' panel over the field: Blue's hand above Red's. Its top strip drags it, and the handle at its lower
         corner towards the field's middle resizes it, inside the field and off the zoom's buttons. -->
    {@const side = panelGesture?.side ?? handleSide(shownAt, field)}
    <div class="hands-panel" style:left="{shownAt.x}px" style:top="{shownAt.y}px" style:width="{shownAt.width}px"
         style:height="{shownAt.height}px" style:--pad="{PANEL_PAD}px" style:--grip="{PANEL_GRIP}px"
         style:--rows-gap="{HANDS_GAP / 2}px">
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="grip" class:dragging={!!dragAt} title="Drag to move the hands" onpointerdown={ev => grab(ev, "move")}
           onpointermove={drag} onpointerup={drop} onpointercancel={drop}><span></span></div>
      {@render handOf(0)}
      {@render handOf(1)}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div class="resize {side}" title="Drag to resize the hands" onpointerdown={ev => grab(ev, "size")}
           onpointermove={drag} onpointerup={drop} onpointercancel={drop}>
        <svg viewBox="0 0 10 10" width="10" height="10" aria-hidden="true">
          <path d={side === "right" ? "M9 3L3 9M9 6L6 9" : "M1 3L7 9M1 6L4 9"} />
        </svg>
      </div>
    </div>
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="field" class:aim={foot?.legal} class:still bind:this={el} onpointerdown={down} onpointermove={move} onpointerup={ev => up(ev, true)}
       onpointercancel={ev => up(ev, false)} onlostpointercapture={ev => up(ev, false)}
       onpointerleave={ev => { if (ev.pointerType === "mouse") pointAt(null); }}
       oncontextmenu={ev => { if (onnotes || onedit) ev.preventDefault(); }}>
    {#if field.width > 0 && field.height > 0}
      <svg width={field.width} height={field.height} viewBox={vb.join(" ")} role="img" aria-label="Blueprints board">
        <defs>
          <pattern id={gridId} patternUnits="userSpaceOnUse" width={GRID_TILE.width} height={GRID_TILE.height}>
            <path d={GRID_TILE_PATH} class="grid" />
          </pattern>
          <!-- The change style's two marks, in each player's colour, as Hedge School's board draws them (design 30):
               dots on an empty hex that a side will probably fill, and hatching on a cell that its owner will
               probably lose. -->
          {#each ([0, 1] as const) as side (side)}
            <pattern id={markId("close", side)} class="change p{side}" patternUnits="userSpaceOnUse" width="0.8" height="0.8">
              <circle cx="0.4" cy="0.4" r="0.12" />
            </pattern>
            <pattern id={markId("lose", side)} class="change p{side}" patternUnits="userSpaceOnUse" width="0.6" height="0.6"
                     patternTransform="rotate(45)">
              <line x1="0" y1="0.3" x2="0.6" y2="0.3" />
            </pattern>
          {/each}
          <!-- The label badges' shadow, as Hedge School's board's. -->
          <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0.05" dy="0.08" stdDeviation="0.06" flood-opacity="0.5" />
          </filter>
        </defs>
        <rect x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} class="bg" />
        <!-- The grid, while its hexes are large enough to read (a hex 8 pixels across), and a dot on the origin's hex
             while it is empty: the board's coordinates count from it. -->
        {#if layers.grid && view.scale >= 4}
          <rect x={vb[0]} y={vb[1]} width={vb[2]} height={vb[3]} fill="url(#{gridId})" />
          <circle r="0.16" class="origin" />
        {/if}

        <!-- The ownership style (design 30) on an empty hex, under the cells, as Hedge School's board draws it under its
             edges: a hex in the colour of the side that the engine expects to hold it, as strong as it holds it. -->
        {#each areaMarks as { hex, m } (hexKey(hex))}
          {#if m.kind === "hold" && !owners.has(hexKey(hex))}
            <path d={hexPath(...center(hex))} class="hold p{m.side}" fill-opacity={AREA_ALPHA * m.strength} />
          {/if}
        {/each}

        <!-- The marked hexes of the player's notes, filled faintly under the cells: an empty hex shows the fill, and a
             cell keeps its owner's colour. Their rings go over everything (below). -->
        {#each shownNotes as n, i (i)}
          {#if !n.to}
            <path d={hexPath(...center(n.at))} class="note-fill" class:drawing={i === drawing}
                  style:--note="var(--note-{n.brush})" />
          {/if}
        {/each}

        {#each cells as c (hexKey(c.hex))}
          <Cell hex={c.hex} owner={c.owner} kind={c.kind} />
        {/each}

        {#each targets as t (hexKey(t))}
          <path d={hexPath(...center(t))} class="target" />
        {/each}

        <!-- Over the cells: a cell that the forecast gives the other side gets a smaller hex in that side's colour, as
             KaTrain marks a stone that it expects to die. Then the change style's marks, and the difference style's
             signs, each as strong as the forecast rose or fell: a green plus or a yellow minus, by good or bad for the
             player who chose (signInk), with a halo in the board's colour that keeps it 3:1 against a cell. -->
        {#each areaMarks as { hex, m } (hexKey(hex))}
          {@const [x, y] = center(hex)}
          {#if m.kind === "hold"}
            {#if owners.has(hexKey(hex)) && owners.get(hexKey(hex)) !== m.side}
              <path d={hexPath(x, y, 0.5)} class="hold p{m.side}" fill-opacity={Math.min(1, 0.4 + 0.6 * m.strength)} />
            {/if}
          {:else if m.kind === "close" || m.kind === "lose"}
            <path d={hexPath(x, y)} fill="url(#{markId(m.kind, m.side)})" class="change-hex" />
          {:else if m.kind === "fall" || m.kind === "rise"}
            {@const d = m.kind === "rise" ? `M${x - 0.38} ${y}H${x + 0.38}M${x} ${y - 0.38}V${y + 0.38}` : `M${x - 0.38} ${y}H${x + 0.38}`}
            <g class="sign" opacity={m.strength}><path {d} class="halo" /><path {d} class="ink" style:stroke={signInk(m.kind)} /></g>
          {/if}
        {/each}

        <!-- The moves of the turn so far: the last move's captured cells, and one outline round each placement's
             footprint. The outline is the edge of the footprint as a whole, as a candidate outline is, so that it has
             one width all round. Its stroke is centred on that edge and clipped to the footprint: the inner half
             shows, and the cells on the touching hexes stay clear. Round caps fill the inner corners. -->
        {#if lastPlace}
          {#each lastPlace.captured as c (hexKey(c.hex))}
            <Cell hex={c.hex} owner={c.owner} kind={c.kind} look="captured" />
          {/each}
        {/if}
        {#each turnPlaces as m, i (i)}
          <clipPath id="{lastId}-{i}">
            {#each m.footprint as s (hexKey(s.hex))}
              <path d={hexPath(...center(s.hex))} />
            {/each}
          </clipPath>
          <path d={outlinePath(m.footprint.map(s => s.hex))} clip-path="url(#{lastId}-{i})" class="last-move-outline" />
        {/each}

        <!-- The candidates: each placement's candidate outline, the cells of the active one faded in the mover's colour,
             then all the ranks over them. The first choice is drawn last, so that it stays on top. -->
        {#if showCandidates}
          {@const ordered = placements.toReversed()}
          {#each ordered as c (c.name)}
            {@const isActive = active?.name === c.name}
            <g class="candidate" class:first={c.rank === 1} class:active={isActive}>
              <path d={outlinePath(c.move.footprint.map(s => s.hex))} class="candidate-outline" />
              {#if isActive}
                {#each c.move.footprint as s (hexKey(s.hex))}
                  <Cell hex={s.hex} owner={c.move.player} kind={s.kind} look="ghost" />
                {/each}
              {/if}
            </g>
          {/each}
          {#each ordered as c (c.name)}
            <g class="candidate" class:first={c.rank === 1} class:active={active?.name === c.name}>
              {@render rankAt(rankPlaces.get(c.name)!, c.rank)}
            </g>
          {/each}
        {/if}

        <!-- The engine's line from the candidate pointed at or pinned (KaTrain's and Lizzie's way): each placement's
             cells faded and dashed in the mover's colour, numbered from the candidate, which is 1, on its hex. Its
             captured cells are drawn as the last move's are. A line's edits are numbered in the hands. -->
        {#if drawn.length}
          <g class="line">
            {#each lineCaptured as c, i (i)}
              <Cell hex={c.hex} owner={c.owner} kind={c.kind} look="captured" />
            {/each}
            {#each drawn as l, i (i)}
              {#if l.move.type === "place"}
                {#each l.move.footprint as s (hexKey(s.hex))}
                  <Cell hex={s.hex} owner={l.move.player} kind={s.kind} look="ghost" />
                {/each}
              {/if}
            {/each}
            {#each drawn as l, i (i)}
              {#if l.move.type === "place"}
                {@const [x, y] = center(l.move.at)}
                <!-- The number, in a small disc at the anchor cell's corner: the cell stays in view. -->
                {@const r = 0.38}
                {@const [cx, cy] = [x + 0.6, y - 0.52]}
                <circle {cx} {cy} {r} class="line-badge p{l.move.player}" />
                <text x={cx} y={cy + 0.42 * r} style:font-size="{1.2 * r}px" class="badge-number">{i + 1}</text>
              {/if}
            {/each}
          </g>
        {/if}

        <!-- The player's own move: a dot on each marked anchor hex (strategyjam.org's "Dots"), and the chosen
             blueprint's footprint with a ring on its anchor hex. On a marked hex, the footprint's cells show faded in
             the mover's colour, as a candidate's do. On another hex, only its outline shows, dashed. -->
        {#if takes && mover !== null}
          <g class="input p{mover}">
            {#each takes.anchors ?? [] as a (hexKey(a))}
              {#if !(foot && sameHex(foot.at, a))}
                {@const [x, y] = center(a)}
                <circle cx={x} cy={y} r="0.22" class="dot" />
              {/if}
            {/each}
            {#if foot && foot.cells.length}
              {#if foot.legal}
                {#each foot.cells as s (hexKey(s.hex))}
                  <Cell hex={s.hex} owner={mover} kind={s.kind} look="ghost" />
                {/each}
              {/if}
              <path d={outlinePath(foot.cells.map(s => s.hex))} class="foot" class:off={!foot.legal} />
              <path d={hexPath(...center(foot.at), 0.8)} class="foot-anchor" class:off={!foot.legal} />
            {/if}
          </g>
        {/if}

        <!-- The quality labels of the turn just played, as Hedge School's board draws its badges. -->
        {#each boardLabels as b, i (i)}
          <g role="img" aria-label={b.note}><title>{b.note}</title>
            <circle cx={b.x} cy={b.y} r="0.62" style:fill="var(--{b.label}-fill)" filter="url(#{shadowId})" />
            <LabelMark label={b.label} transform="translate({b.x - 0.62} {b.y - 0.62}) scale({1.24 / 24})" />
          </g>
        {/each}

        <!-- The player's notes, and the one being drawn, over the board: a marked hex's ring inside the hex, round a
             cell's mark, and an arrow from a hex's centre to another's. Each has a halo in the board's colour, so that it
             reads on a cell of either player. -->
        {#each shownNotes as n, i (i)}
          <g class="note" class:drawing={i === drawing} data-brush={n.brush}
             style:--note="var(--note-{n.brush})">
            {#if n.to}
              <path d={arrowPath(n.at, n.to)} class="note-arrow" />
            {:else}
              {@const d = hexPath(...center(n.at), 0.76)}
              <path {d} class="note-halo" /><path {d} class="note-ring" />
            {/if}
          </g>
        {/each}

        {#if hoverHex}
          <path d={hexPath(...center(hoverHex))} class="hover" />
        {/if}
      </svg>

      <!-- Number 1's note gives its own values, the others' notes their difference from number 1. -->
      {#if hovered?.move.type === "place" && hovered.note}
        {@const n = noteAt(hovered.move.at)}
        <div class={["pointer-events-none absolute -translate-y-1/2 rounded-md border px-2 py-0.5 text-[13px] leading-[normal]",
                     "whitespace-nowrap text-ink", hovered.rank === 1
                       ? "border-(--engine) bg-[color-mix(in_srgb,var(--engine)_35%,var(--panel))] font-semibold"
                       : "border-line bg-panel"]}
             style:left="{n.left ? undefined : n.x + 0.9 * view.scale}px"
             style:right="{n.left ? field.width - n.x + 0.9 * view.scale : undefined}px" style:top="{n.y}px">{hovered.note}</div>
      {/if}
      {#if readout}
        <div class="pointer-events-none absolute top-1.5 left-1.5 rounded bg-panel/85 px-1.5 py-px font-mono text-xs leading-[normal] text-ink">
          {readout}
        </div>
      {/if}
      {#if controls}
        <!-- The controls' strip, left of the zoom's buttons, and twice their inset from them -->
        <div class={["absolute bottom-(--zoom-inset) left-(--zoom-inset) flex h-(--zoom-size) max-w-[calc(100%-var(--zoom-room))]",
                     "items-center gap-2 rounded px-1",
                     "bg-panel/85 pointer-events-none"]}>
          {@render controls()}
        </div>
      {/if}
      {#if !still}
        <div class="absolute right-(--zoom-inset) bottom-(--zoom-inset) flex gap-(--zoom-gap)">
          <button type="button" class={[TOOL, "text-ink"]} onclick={() => zoomBy(Math.SQRT2)} aria-label="Zoom in" title="Zoom in">+</button>
          <button type="button" class={[TOOL, "text-ink"]} onclick={() => zoomBy(Math.SQRT1_2)} aria-label="Zoom out" title="Zoom out">−</button>
          <button type="button" class={[TOOL, manual || placedByPlayer ? "text-ink" : "text-muted"]} onclick={fitAll}
                  aria-label="Show all the cells" title="Show all the cells">
            <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
              <path d="M1 5V1h4M11 1h4v4M15 11v4h-4M5 15H1v-4" fill="none" stroke="currentColor" stroke-width="1.6" />
            </svg>
          </button>
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  /* The area that the page gives: its height, else a square. */
  .board {
    width: 100%; height: 100%; aspect-ratio: 1; min-height: 0; display: grid; gap: var(--gap);
    grid-template-columns: 1fr; grid-template-rows: var(--hand) 1fr var(--hand);
    grid-template-areas: "blue" "field" "red";
  }
  .board.sides { grid-template-columns: var(--hand) 1fr var(--hand); grid-template-rows: 1fr; grid-template-areas: "blue field red"; }
  .board.under { grid-template-areas: "field" "blue" "red"; grid-template-rows: 1fr var(--hand) var(--hand); }
  .board.panel { position: relative; grid-template-columns: 1fr; grid-template-rows: 1fr; grid-template-areas: "field"; }
  .hands-panel {
    position: absolute; z-index: 2; display: grid; align-content: start; gap: var(--rows-gap);
    padding: 0 var(--pad) var(--pad); border: 1px solid var(--border); border-radius: 8px;
    background: color-mix(in srgb, var(--panel) 92%, transparent); box-shadow: 0 2px 10px rgb(0 0 0 / 0.18);
  }
  .grip { height: var(--grip); display: grid; place-items: center; cursor: grab; touch-action: none; }
  .grip.dragging { cursor: grabbing; }
  .grip > span { width: 36px; height: 4px; border-radius: 2px; background: var(--muted); opacity: 0.6; }
  /* The resize handle: a square at the panel's lower corner, its two lines towards that corner. */
  .resize {
    position: absolute; bottom: 0; width: 16px; height: 16px; display: grid; place-items: center; touch-action: none;
  }
  .resize.right { right: 0; cursor: nwse-resize; }
  .resize.left { left: 0; cursor: nesw-resize; }
  .resize path { fill: none; stroke: var(--muted); stroke-width: 1.4; stroke-linecap: round; }
  .hand-area { min-width: 0; min-height: 0; overflow: hidden; }
  .hand-area.p0 { grid-area: blue; }
  .hand-area.p1 { grid-area: red; }
  .field {
    grid-area: field; position: relative; min-width: 0; min-height: 0; overflow: hidden; border-radius: 6px;
    touch-action: none; /* a drag pans the board, not the page */ user-select: none; cursor: grab;
  }
  .field:active { cursor: grabbing; }
  .field.aim { cursor: pointer; }
  .field.still { touch-action: auto; cursor: default; }
  .field > svg { display: block; }
  .bg { fill: var(--board-bg); }
  .grid { fill: none; stroke: var(--board-dot); stroke-width: 0.04; opacity: 0.7; }
  .origin { fill: var(--board-dot); }
  /* The last move's outline: 0.14 of a hex's radius shows, inside the footprint. */
  .last-move-outline { fill: none; stroke: var(--last); stroke-width: 0.28; stroke-linecap: round; pointer-events: none; }
  .target { fill: var(--accent); fill-opacity: 0.35; stroke: var(--accent); stroke-width: 0.3; stroke-opacity: 0.6; pointer-events: none; }
  .hover { fill: var(--last); fill-opacity: 0.25; stroke: var(--last); stroke-width: 0.08; pointer-events: none; }
  /* The area map, in the players' colours, as Hedge School's board draws it. */
  .hold, .change-hex { stroke: none; pointer-events: none; }
  .hold.p0 { fill: var(--blue); }
  .hold.p1 { fill: var(--red); }
  .change circle { stroke: none; }
  .change.p0 circle { fill: var(--blue); }
  .change.p1 circle { fill: var(--red); }
  .change line { stroke-width: 0.12; }
  .change.p0 line { stroke: var(--blue); }
  .change.p1 line { stroke: var(--red); }
  .sign { pointer-events: none; }
  .sign path { fill: none; stroke-linecap: round; }
  .sign .halo { stroke: var(--board-bg); stroke-width: 0.3; }
  .sign .ink { stroke-width: 0.14; }

  /* Candidates: the first choice in the engine's colour, thicker, the others grey and faded until hover. */
  .candidate { opacity: 0.6; transition: opacity 0.12s; pointer-events: none; }
  .candidate.first { opacity: 0.95; }
  .candidate.active { opacity: 1; }
  .candidate-outline { fill: none; stroke: var(--candidate); stroke-width: 0.12; stroke-linecap: round; }
  .first .candidate-outline { stroke: var(--engine); stroke-width: 0.2; }
  .rank { fill: var(--candidate); stroke: var(--board-bg); stroke-width: 0.08; }
  .first .rank { fill: var(--engine); }
  .active .rank { stroke: var(--text); stroke-width: 0.1; }
  .badge-number { font-size: 0.8px; fill: var(--on-badge); text-anchor: middle; font-weight: 700; font-family: system-ui, sans-serif; }
  .line { pointer-events: none; }
  .line-badge { stroke: var(--board-bg); stroke-width: 0.08; }
  .line-badge.p0 { fill: var(--blue); }
  .line-badge.p1 { fill: var(--red); }
  /* The player's own move, in the mover's colour. */
  .input { pointer-events: none; }
  .input.p0 { --own: var(--blue); }
  .input.p1 { --own: var(--red); }
  .dot { fill: var(--own); }
  .foot { fill: none; stroke: var(--own); stroke-width: 0.12; stroke-linecap: round; }
  .foot.off { stroke: var(--muted); stroke-dasharray: 0.25 0.15; }
  .foot-anchor { fill: none; stroke: var(--text); stroke-width: 0.08; }
  .foot-anchor.off { stroke: var(--muted); }
  /* The player's notes, in the notes' colours (@abstractclass/review/review.css, set in the markup as --note), soft as
     Lichess's shapes. */
  .note { opacity: 0.85; pointer-events: none; }
  .note.drawing { opacity: 0.55; }
  .note-fill { fill: var(--note); fill-opacity: 0.3; stroke: none; pointer-events: none; }
  .note-fill.drawing { fill-opacity: 0.18; }
  .note-halo { fill: none; stroke: var(--board-bg); stroke-width: 0.26; stroke-linejoin: round; }
  .note-ring { fill: none; stroke: var(--note); stroke-width: 0.14; stroke-linejoin: round; }
  .note-arrow { fill: var(--note); stroke: var(--board-bg); stroke-width: 0.08; stroke-linejoin: round; paint-order: stroke; }
</style>
