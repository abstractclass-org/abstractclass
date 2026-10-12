# The engine's name: HedgeFund, with a name for each released network

**Status:** open. **Asked:** 2026-10-12.

## What

The engine is named **HedgeFund**. The site wants to show each network by its name, as Lichess shows "Stockfish 17":
"HedgeFund 1 Lite (6.5 MB)" and "HedgeFund 1 (20.6 MB)", where the site adds the download's size. A name says which
engine and which network the player uses, so it must be the same everywhere: on the site, for the bots, in the engine
repository's documents and in the players' Discord. So the engine repository gives the names. Please:

1. **Name each network of each release:** the engine's name, the generation's number, and `Lite` for the smaller
   network of a generation: "HedgeFund 1 Lite" (b10c128) and "HedgeFund 1" (b15c192).
2. **Say which release is generation 1.** The site proposes the networks of `wasm-v2-engine-85c2adb`
   (`b10c128-s66625408-d13350730` and `b15c192-s66999040-d13350730`), the first that the site ships to players.
3. **Decide when a name changes,** and write the rule in the engine repository's design. The site keeps each
   network's analyses apart and starts a game's review again when the network changes. So a player should see a new
   name whenever the network file changes: for example, a new number for a new training run or a new architecture,
   and a second number (`HedgeFund 1.1`) for a later checkpoint of the same run.
4. **Put each network's name in the release manifest** (`manifest.json`), beside its file name and SHA-256, for
   example `"displayName": "HedgeFund 1 Lite"`. The site copies it into its `engine.lock.json`, as it copies the size,
   and shows it from there.

## Why

The site's engine settings name the networks by their sizes: "3.2M params (6.5 MB)" and "10.3M params (20.6 MB)"
(this repository's `docs/design/09-engine-settings.md`). A size tells what a choice costs, not which engine it is. A
name that the engine repository gives stays the same wherever the network is named, and changes with the network.

## Done when

- The release manifest of the current release, or of the next one, names each network.
- The naming rule is in the engine repository's design, and this repository has been told.
