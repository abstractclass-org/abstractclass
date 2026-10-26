// What the bookmarklet and the userscript (tools.ts) run in the player's own strategyjam.org game page of Blueprints
// (`/blueprints/game/ID`), and their messages. Each function is self-contained (no imports, nothing from outside its
// own body): the two carry their source as text. The engine repository's docs/context.md, "strategyjam.org internals",
// describes the page, and its game watch saves Blueprints' module (runs/strategyjam/blueprints/, g/blueprints/). The
// page is strategyjam.org's game page, as Enclosure's is (Hedge School's src/lib/game/strategyjamPage.ts). In a wide
// window Blueprints' module draws the stage itself (`.stage.stage-whole`), and in a narrow one strategyjam.org's own
// view draws it (`.stage`). Both hold the game in the props of the components above the stage, and both have the
// replay slider.
import type { JamGame } from "./strategyjam.ts";

/** Why the page gives no game: "none", it holds no game; "login", strategyjam.org shows a finished game only to a player
 *  who is logged in; "loading", it waits for the game. */
export type JamMissing = "none" | "login" | "loading";

/** The position that the page shows, as the game's moves before it (0 at the start, a pass one move, as in `history`),
 *  or "" when the page does not say. The import page shows it. The replay row has a slider (`.replay-slider`, "Move")
 *  whose value is that count, live or in a replay: strategyjam.org's own (its match module), which Blueprints' module
 *  puts under the board in a wide window, and strategyjam.org's view in the panel in a narrow one. */
export function jamShownMove(): string {
  const slider = document.querySelector("input.replay-slider") as HTMLInputElement | null;
  return slider ? slider.value : "";
}

/** The game that the page shows, or why it shows none. React keeps the game in the props of the components above the
 *  stage (`.stage`): `game`, the game's module, with its rules module in `rules`, `gameId`, and `state`, the game as
 *  the site sends it: the seats, the first position (`initial`), the moves (`history`), the clock and the result. Until
 *  the game comes, `state` is null and `status` says why ("connecting", "login", ...), and strategyjam.org's own view
 *  draws an empty stage. The scores come from the page's own rules module, which plays the moves again: its `observe`
 *  gives them. The game's id is the last part of the page's path. No request to strategyjam.org, and nothing from the
 *  player's login. */
export function findJamGame(): JamGame | JamMissing {
  type Result = JamGame["result"];
  type Rules = { id: string; version: number; play(state: unknown, move: string): unknown;
                 observe(state: unknown, seat: number): { scores?: number[]; result?: Result } };
  type Clock = { initialMs?: number; incrementMs?: number; startedAt?: number };
  type State = { seats: (string | null)[]; initial: unknown; history: string[]; result?: Result;
                 view?: { result?: Result } | null; clock?: Clock | null; times?: number[] };
  type Props = { game?: { rules?: Rules }; state?: State | null; status?: string };
  type Fiber = { return: Fiber | null; alternate: Fiber | null; memoizedProps?: Props };
  const stage = document.querySelector(".stage") as (Element & Record<string, unknown>) | null;
  const key = stage && Object.keys(stage).find(k => k.startsWith("__reactFiber"));
  const moves = (p: Props | null) => (p && p.state && Array.isArray(p.state.history) ? p.state.history.length : -1);
  let props: Props | null = null;
  for (let f = (key ? stage![key] : null) as Fiber | null; f && !props; f = f.return)
    for (const x of [f, f.alternate]) {
      const p = x && x.memoizedProps;
      // Of a component's two copies (React's current one and its last), the one with more moves is the newer.
      if (p && p.game && p.game.rules && "state" in p && (!props || moves(p) > moves(props))) props = p;
    }
  if (!props) return "none";
  const s = props.state, rules = props.game!.rules!;
  if (!s || moves(props) < 0) return props.status === "login" ? "login" : /connecting/.test(props.status ?? "") ? "loading" : "none";
  let end: ReturnType<Rules["observe"]> | null = null;
  try { end = rules.observe(s.history.reduce((state, move) => rules.play(state, move), s.initial), 0); } catch { /* no scores */ }
  const c = s.clock;
  return {
    id: location.pathname.split("/").filter(Boolean).pop() ?? "", rules: rules.id, version: rules.version, seats: s.seats,
    initial: s.initial, history: s.history,
    scores: end && Array.isArray(end.scores) ? end.scores : null,
    // As the page reads the result: the view's while it plays, else the site's, else the rules'.
    result: (s.view && s.view.result) || s.result || (end && end.result) || null,
    startedAt: (c && c.startedAt) || (s.times && s.times[0]) || null,
    clock: c && typeof c.initialMs === "number" && typeof c.incrementMs === "number"
      ? { initialMs: c.initialMs, incrementMs: c.incrementMs } : null,
  };
}

/** What to tell the player when the page gives no game. `click` names what they click again: "the Open in Drawing Board
 *  bookmark", or "the Drawing Board button". `origin` is this site's address: with no game on a page that shows one,
 *  strategyjam.org possibly changed its page, and this site's tools page has the tools as they are now. Strict
 *  Simplified Technical English: the player follows these texts. */
export function explain(why: JamMissing, click: string, origin: string): string {
  return "Drawing Board: " + (why === "none"
    ? `this page shows no game that Drawing Board can read. Open a game of Blueprints on strategyjam.org: a game that you play or watch, or a finished game. Then click ${click} again. If a game shows and you see this message again, strategyjam.org possibly changed its page. The newest bookmarklet and userscript are on ${origin}/tools.`
    : why === "login" ? `strategyjam.org shows a finished game only after you log in. Log in to strategyjam.org. Then click ${click} again.`
    : `this page does not have the game's moves yet. Wait a moment. Then click ${click} again.`);
}
