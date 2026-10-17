# The review's mock data

`src/lib/mock/review.json` is mock data for the review wireframe. It is made from the fixture game
(`src/lib/prototype/game.json`) in three steps. The engine repository is read here, never changed. The commands run
in the site's folder, `apps/hedgeschool`.

```sh
# 1. The state after each edge: the engine repository's Python engine replays the game.
../../../engines/.venv/Scripts/python.exe -I scripts/mock/replay.py ../../../engines src/lib/prototype/game.json OUT/replay.json
# 2. Candidates and win values for each position: the current WebAssembly module at 64 visits.
node scripts/mock/analyse.mjs static/engine/v2-b10c128-s46923648-d9407005/v2-bot.wasm src/lib/prototype/game.json 64 OUT/analysis.json
```

3. Merge the two into `src/lib/mock/review.json`: the positions and moves from step 1, and for each position the
   analysis from step 2, with each candidate's site move ID turned into an edge `[x1, y1, x2, y2]` and each value
   turned into Blue's win chance (0.5 + 0.5 × evaluation).

Replace all of this with the engine protocol's output when it exists (docs/requests/02-engine-protocol.md).
