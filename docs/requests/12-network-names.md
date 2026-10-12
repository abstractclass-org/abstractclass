# The engine's name: HedgeFund, with a name for each released network

**Status:** done, checked here. **Asked:** 2026-10-12. **Delivered:** 2026-10-12.

## What

The engine's name is **HedgeFund**. The site wants to show each network by its name, as Lichess shows "Stockfish 17":
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

The site's engine settings name the networks by their sizes: "3.2M params (6.5 MB)" and "10.3M params (20.6 MB)" (this
repository's `docs/design/09-engine-settings.md`). A size tells what a choice costs, not which engine it is. A name that
the engine repository gives stays the same wherever a page or a person names the network, and changes with the network.

## Done when

- The release manifest of the current release, or of the next one, names each network.
- The naming rule is in the engine repository's design, and the engine repository tells this repository.

## Delivered

The engine is HedgeFund. The release `wasm-v2-engine-85c2adb` is its first generation, named as version 0.1: its
`manifest.json` now gives each network a `displayName`, beside its file name and SHA-256. Only the manifest changed:
every other file has the same SHA-256, so `engine.lock.json` stayed valid.

- `b10c128-s66625408-d13350730` is "HedgeFund 0.1 Lite".
- `b15c192-s66999040-d13350730` is "HedgeFund 0.1".

The rule (the engine repository's `v2/docs/design/20-network-names.md`) differs from this request in three ways:

1. The versions start at 0.1, for the early access, not at 1.
2. One counter: every release with a new network file takes the next number (0.2, 0.3), whether the network is a
   later checkpoint or a new architecture. There are no second-level numbers.
3. A name belongs to one network file for life. A release that keeps a file keeps its name, so one release can hold
   "HedgeFund 0.1 Lite" beside "HedgeFund 0.2". The site's analyses, keyed by network, never split.

A role word names the role, never the architecture: "Lite" is the small, fast network, and no word names the main one.
A release of the module alone keeps the names. Its build is in the manifest.

**Checked here:** the manifest's SHA-256 values match `engine.lock.json`. The site copies the names into the lock
(`displayName`) and into the site's own manifest (`scripts/fetch-engine.mjs`). The engine settings show "HedgeFund 0.1
Lite (6.5 MB)" and "HedgeFund 0.1 (20.6 MB)" (checked in Edge), and the annotated record's note and the review file
name the network by its name and its id.
