"""Replays the fixture game through the engine repository's Python engine (read-only use) and writes, for each
position, the state the board needs: each player's edges, the invincible and placed edges, the scores, the regions as
polygons, and the edge each move cut. Mock data for the review wireframe.

    ENGINE_REPO/.venv/Scripts/python.exe replay.py ENGINE_REPO GAME.json OUT.json
"""
import json
import sys

engine_repo, game_path, out_path = sys.argv[1:4]
sys.path.insert(0, engine_repo)
import numpy as np  # noqa: E402
import shapely  # noqa: E402
from enclosure.engine import Position, encode_action  # noqa: E402

STEPS = [(dx, dy) for dy in range(-3, 4) for dx in range(-3, 4) if dx or dy]


def site_edge(move_id):
    s = move_id % 361
    dx, dy = STEPS[move_id // 361]
    a = (s % 19, s // 19)
    return a, (a[0] + dx, a[1] + dy)


def flat(e):
    (ax, ay), (bx, by) = e
    return [ax, ay, bx, by]


def regions(edges):
    if len(edges) < 3:
        return []
    noded = shapely.union_all(shapely.linestrings(np.array(list(edges), dtype=float)))
    faces = shapely.get_parts(shapely.polygonize(shapely.get_parts(noded)))
    out = []
    for f in faces:
        rings = [f.exterior] + list(f.interiors)
        out.append({"area": round(f.area, 3),
                    "rings": [[[round(x, 3), round(y, 3)] for x, y in r.coords[:-1]] for r in rings]})
    return out


def state(p):
    return {
        "edges": [sorted(flat(e) for e in p.edges[0]), sorted(flat(e) for e in p.edges[1])],
        "protected": sorted(flat(e) for e in p.protected),
        "placed": sorted(flat(e) for e in p.placed),
        "scores": [round(s, 3) for s in p.scores],
        "player": p.player,
        "movesLeft": p.moves_left,
        "regions": [regions(p.edges[0]), regions(p.edges[1])],
    }


game = json.load(open(game_path))
p = Position()
positions, moves = [state(p)], []
for move_id in game["siteMoves"]:
    a, b = site_edge(move_id)
    legal = set(p.legal_actions())
    action = next(x for x in (encode_action(a, b), encode_action(b, a)) if x in legal)
    mover, before = p.player, set(p.edges[1 - p.player])
    p.play(action)
    cut = before - p.edges[1 - mover]
    moves.append({"player": mover, "edge": flat((a, b)), "cut": flat(next(iter(cut))) if cut else None})
    positions.append(state(p))

json.dump({"moves": moves, "positions": positions}, open(out_path, "w"), separators=(",", ":"))
print(f"{len(moves)} moves, final scores {positions[-1]['scores']}, cuts {sum(m['cut'] is not None for m in moves)}")
