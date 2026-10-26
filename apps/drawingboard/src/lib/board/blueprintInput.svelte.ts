// The player's own moves on Blueprints' board: the board's part of the view's game interface (MoveInput,
// @abstractclass/review/game.ts), as Hedge School's EdgeInput is Enclosure's. What a click does is in input.ts. The
// board calls `clickBoard` and `clickHand`, and draws the marked hexes (`anchors`, `targets`) and the move shown. The
// view sets `rules` for each position, and Escape calls `reset`.
import type { MoveInput } from "@abstractclass/review/game.ts";
import type { Move } from "../game/notation.ts";
import type { Hex } from "./hex.ts";
import { anchorsOf, clickBoard, clickHand, IDLE, legalOf, targetsOf, type Begun, type Click, type InputRules, type InputView,
         type Refusal } from "./input.ts";
import type { HandHex, Player } from "./position.ts";

export class BlueprintInput implements MoveInput<InputRules>, InputView {
  /** The position's rules, or null when they are not known: the board then takes no move. */
  rules = $state.raw<InputRules | null>(null);
  /** The move begun: Escape cancels it. */
  pending = $state.raw<Begun | null>(null);
  refused = $state.raw<Refusal | null>(null);

  legal = $derived(this.rules ? legalOf(this.rules) : null);
  /** The marked anchor hexes of the chosen blueprint. Null: no blueprint chosen. */
  anchors = $derived<Hex[] | null>(this.legal && anchorsOf(this.pending, this.legal));
  /** The marked new places of the chosen cell. Null: no cell chosen. */
  targets = $derived<HandHex[] | null>(this.legal && targetsOf(this.pending, this.legal));
  /** Every new place of an edit of the mover: the hands show these hexes, so that the hands' scale stays as it is
   *  when a cell is chosen. */
  reach = $derived<HandHex[]>(this.legal ? [...this.legal.edits.values()].flat() : []);

  constructor(private play: (move: Move) => void) {}

  #take(click: Click) {
    this.pending = click.state.begun;
    this.refused = click.state.refused;
    if (click.move) this.play(click.move);
  }
  clickBoard = (hex: Hex, touch: boolean) => {
    if (this.legal) this.#take(clickBoard({ begun: this.pending, refused: null }, this.legal, hex, touch));
  };
  clickHand = (player: Player, at: HandHex, touch: boolean) => {
    if (this.rules && this.legal) this.#take(clickHand({ begun: this.pending, refused: null }, this.rules, this.legal, player, at, touch));
  };
  reset = () => { this.pending = IDLE.begun; this.refused = IDLE.refused; };
}
