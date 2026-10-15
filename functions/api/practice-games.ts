// Practice games, stored when they end (docs/design/25-practice-games-stored.md): POST keeps a game, DELETE removes the
// games of a browser's random number. A Pages Function on the site's own Cloudflare project, with a D1 database bound
// as GAMES: the production deployment's own, and the previews' own (docs/hosting.md, "Practice games"). The schema is
// in migrations/. The Function keeps no IP address, logs no request, and answers no reads: the
// games are read in Cloudflare's dashboard, or exported from it.
import { RANDOM_ID, STORED_MAX_BYTES, recordEdges, storedDay, storedProblem, type StoredPractice } from "../../src/lib/practice/stored.ts";

/** The part of D1's binding that this Function uses (Cloudflare's D1Database). */
interface D1Statement { bind(...values: unknown[]): D1Statement; run(): Promise<{ meta: { changes: number } }> }
export interface D1 { prepare(sql: string): D1Statement }
interface Context { request: Request; env: { GAMES?: D1 } }

const answer = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const NO_DATABASE = { error: "this deployment has no database for practice games" };

/** Keeps a game: 201 when kept now. 200 when not: a game with its id is kept already, or the games of its number were
 *  deleted. The check of the deleted numbers is in the same statement as the insert, so that a delete cannot come
 *  between them. */
export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!env.GAMES) return answer(503, NO_DATABASE);
  const text = await request.text();
  if (text.length > STORED_MAX_BYTES) return answer(413, { error: "the game is larger than a game can be" });
  let game: unknown;
  try { game = JSON.parse(text); } catch { return answer(400, { error: "the game is not JSON" }); }
  const problem = storedProblem(game);
  if (problem) return answer(400, { error: `the game's ${problem} is not valid` });
  const g = game as StoredPractice;
  const { meta } = await env.GAMES.prepare(
    `INSERT OR IGNORE INTO practice_games (id, browser, ended, received, site, network, visits, variety, form, side, outcome, edges, game)
     SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13
     WHERE NOT EXISTS (SELECT 1 FROM deleted_browsers WHERE browser = ?2)`,
  ).bind(g.id, g.browser, g.ended, storedDay(new Date()), g.site, g.bot.network, g.bot.visits, g.bot.variety, g.bot.form, g.side,
         g.outcome, recordEdges(g.record), text).run();
  return answer(meta.changes ? 201 : 200, { added: meta.changes > 0 });
}

/** Deletes the games of a browser's random number (the privacy page's "Delete my practice games"): their count. The
 *  number goes into the deleted numbers first, so that a game with it that arrives during or after the delete is not
 *  kept: a game kept before that row is deleted by the second statement, and one after it is refused. */
export async function onRequestDelete({ request, env }: Context): Promise<Response> {
  if (!env.GAMES) return answer(503, NO_DATABASE);
  let body: unknown;
  try { body = await request.json(); } catch { return answer(400, { error: "the request is not JSON" }); }
  const browser = (body as { browser?: unknown } | null)?.browser;
  if (typeof browser !== "string" || !RANDOM_ID.test(browser)) return answer(400, { error: "the browser's number is not valid" });
  await env.GAMES.prepare("INSERT OR IGNORE INTO deleted_browsers (browser) VALUES (?1)").bind(browser).run();
  const { meta } = await env.GAMES.prepare("DELETE FROM practice_games WHERE browser = ?1").bind(browser).run();
  return answer(200, { deleted: meta.changes });
}
