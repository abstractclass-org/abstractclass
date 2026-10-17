// What the bookmarklet (bookmarklet.ts) and the userscript (userscript.ts) run in the player's own strategyjam.org game
// page (`/enclosure/game/ID`). The function is self-contained (no imports, nothing from outside its own body): the two
// carry their source as text. The engine repository's docs/context.md, "strategyjam.org internals", describes the page.
import type { JamGame } from "./strategyjam.ts";

/** Why the page gives no game: "none", it holds no game; "login", strategyjam.org shows a finished game only to a player
 *  who is logged in; "loading", it waits for the game. */
export type JamMissing = "none" | "login" | "loading";

/** The game that the page shows, or why it shows none. React keeps the game in the props of the component that draws
 *  the stage (`.stage`, the board and the panel): `game`, the game's module, with its rules module in `rules`, and
 *  `state`, the game as the site sends it: the seats, the first position (`initial`), the moves (`history`) and the
 *  result. Until the game comes, `state` is null and `status` says why ("connecting", "login", ...). The scores come
 *  from the page's own rules module, which plays the moves again. No request to strategyjam.org, and nothing from the
 *  player's login. */
export function findJamGame(): JamGame | JamMissing {
  type Result = JamGame["result"];
  type Rules = { id: string; version: number; play(state: unknown, move: string): unknown;
                 observe(state: unknown, seat: number): { scores?: number[]; result?: Result } };
  type State = { seats: (string | null)[]; initial: unknown; history: string[]; result?: Result;
                 view?: { result?: Result } | null; clock?: { startedAt?: number } | null; times?: number[] };
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
  return {
    page: location.origin + location.pathname, rules: rules.id, version: rules.version, seats: s.seats, history: s.history,
    scores: end && Array.isArray(end.scores) ? end.scores : null,
    // As the page reads the result: the view's while it plays, else the site's, else the rules'.
    result: (s.view && s.view.result) || s.result || (end && end.result) || null,
    startedAt: (s.clock && s.clock.startedAt) || (s.times && s.times[0]) || null,
  };
}
