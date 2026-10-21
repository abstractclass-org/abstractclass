# A game analysis tool for human players: design from sources

**Status:** in force. It is the product's first design. **Written:** in the engine repository, before this repository
existed, as
[`docs/analysis-tool-design.md`](https://github.com/abstractclass-org/engines/blob/main/docs/analysis-tool-design.md).
**Moved here:** 2026-10-09. **Changed:** 2026-10-20: the tags and the names of concepts rest on engine facts, not on
the community's terms (principles 8 and 10), and the area map explains from engine facts (principle 11, design 30).
Where the tool runs and how it gets the engine is in [02-static-site.md](02-static-site.md).

Paths in this document are in the engine repository ([engines](https://github.com/abstractclass-org/engines)),
unless a link says otherwise. Paths under `runs/` are not in Git there.

The aim: help people learn Enclosure. The tool reviews games, labels moves, finds puzzles, and distills rules of
thumb, the way chess and Go tools do. Everything below comes from a tool's source code or a peer-reviewed paper. Each
constant says where it came from, so that we fit our own instead of copying.

## 1. What the sources do

### Tools (source code read)

| Tool | Where it lives | What it does, exactly |
|---|---|---|
| **Lichess move labels** | [lila `modules/tree/src/main/Advice.scala`](https://github.com/lichess-org/lila) | Inaccuracy, mistake and blunder when the mover's *winning chances* (−1..+1) drop by ≥0.1, ≥0.2 or ≥0.3, i.e. 5, 10 and 15 win% points (win% = 50 + 50 × winning chances). Separate rules when a forced mate is created or lost. |
| **Lichess eval to win chances** | [scalachess `core/src/main/scala/eval.scala`](https://github.com/lichess-org/scalachess), fitted in [lila PR #11148](https://github.com/lichess-org/lila/pull/11148) | winningChances = 2/(1+exp(−0.00368208·cp)) − 1. The constant was fitted with `curve_fit` on 75,000 positions from 2300+ rapid games. The author notes it is about −0.002 for weak players and −0.0038 for strong ones: **the curve depends on rating**. |
| **Lichess accuracy** | lila `modules/analyse/src/main/AccuracyPercent.scala` | Per move: 103.1668·exp(−0.04354·Δwin%) − 3.1669, plus 1 for engine uncertainty. It was curve-fitted to hand-picked points (0 → 100, 10 → 60, 40 → 20, 80 → 0). Per game: the average of a volatility-weighted mean and a harmonic mean. The volatility is the standard deviation of win% over a window of 2–8 moves, clamped to 0.5–12. |
| **Lichess puzzle generator** | [lichess-puzzler `generator/generator.py`](https://github.com/ornicar/lichess-puzzler) | A puzzle starts right after an opponent's blunder. The winner's eval is ≥200 cp, and the winning chances are more than 0.6 above those of the previous position. **Every solution move must be the only good one:** best ≥ second-best + 0.7 winning chances (found with a two-line search). Positions already up material, or repeating, are skipped. |
| **Lichess theme tagger** | lichess-puzzler `tagger/cook.py` (~1,000 lines) | About 40 themes: fork, pin, skewer, deflection, sacrifice, quiet move, mate patterns, endgame types. Each is a **hand-written rule on board geometry**, tested on the puzzle's solution line, not on the blunder. One puzzle can have many tags. Size tags (crushing, advantage, equality) come from the eval. |
| **KaTrain (Go review)** | [katrain `core/game_node.py`, `core/ai.py`, `config.json`](https://github.com/sanderland/katrain) | **Points lost** = the change in KataGo's score lead across the move, from the mover's side. Labels at 12 / 6 / 3 / 1.5 / 0.5 points. **Complexity** = the prior-weighted mean points lost over KataGo's candidate moves, capped at 1 (how easy it is to go wrong here). Game accuracy = 100 × 0.75^(weighted mean points lost), with each move weighted max(0.05, min(1, max(complexity, loss/4))). Also reported: how often the player's move was the AI's top move, or in its top 5 with under 0.5 points lost. |
| **KataGo human model** (already in the fork) | [`katagame/cpp/neuralnet/sgfmetadata.h`](https://github.com/abstractclass-org/KataGame/blob/main/cpp/neuralnet/sgfmetadata.h), [`katagame/docs/Analysis_Engine.md`](https://github.com/abstractclass-org/KataGame/blob/main/docs/Analysis_Engine.md) (`humanSLProfile`, `humanPolicy`) | A network trained on human games with **the game's metadata as input**: both players' ranks, time control, source. The analysis engine reports a `humanPolicy` next to the engine's own for a chosen rank. |
| **Maia** | [CSSLab/maia-chess](https://github.com/CSSLab/maia-chess). [Maia-2](https://github.com/CSSLab/maia2) | Human-like move prediction. Maia: nine networks for ratings 1100–1900, played **without search** (lc0 `go nodes 1`), since search makes it less human. Maia-2: one network that takes both players' ratings as input. |

Not source-available, so not used as a model: chess.com's Game Review and "Expected Points", AI Sensei,
DecodeChess.

### Research (peer-reviewed unless noted)

- **McIlroy-Young, Sen, Kleinberg, Anderson, "Aligning Superhuman AI with Human Behavior: Chess as a Model System",
  KDD 2020** ([arXiv 2006.01855](https://arxiv.org/abs/2006.01855)). Engines predict human moves poorly. A network
  trained per rating band predicts them far better, and a separate network predicts *whether* a human will blunder
  next. **Tang et al., "Maia-2", NeurIPS 2024** ([arXiv 2409.20553](https://arxiv.org/abs/2409.20553)): one model,
  conditioned on rating through skill-aware attention.
- **Regan & Haworth, "Intrinsic Chess Ratings", AAAI 2011**
  ([AAAI](https://ojs.aaai.org/index.php/AAAI/article/view/7951)).
  - **The model:** a player picks move i with probability proportional to exp(−(δᵢ/s)^c), where δᵢ is how much worse
    move i is than the best (from a 50-line engine search). s is "sensitivity" and c "consistency".
  - **Rating from moves:** fitting (s, c) per rating level gives a smooth mapping, so a player's rating can be read
    from the quality of their moves.
  - **Two steps against saturation** (our problem): δ is rescaled so errors in lopsided positions count less (the
    integral of dx/(1+x), i.e. ln(1+x)). Positions more than 3 pawns ahead or behind, and the first 8 turns, are
    skipped.
- **Guid & Bratko, "Search-Based Estimation of Problem Difficulty for Humans", AIED 2013**
  ([Springer](https://link.springer.com/chapter/10.1007/978-3-642-39112-5_131)). Difficulty is modelled as the search
  effort among alternatives. It was validated on strong players. Hristova, Guid & Bratko (2014) found that for
  tactical puzzles it has to account for the patterns humans recognise.
- **IEEE BigData Cup 2024, "Predicting Chess Puzzle Difficulty"**: 4.2 million Lichess puzzles, each Glicko-2-rated
  from solvers' attempts. Top entries include a transformer ([arXiv 2410.11078](https://arxiv.org/abs/2410.11078))
  and pairwise learning-to-rank. The lesson: **rate puzzles from human attempts** where possible. Predicting the
  rating is a fallback.
- **McGrath et al., "Acquisition of chess knowledge in AlphaZero", PNAS 2022**
  ([doi](https://www.pnas.org/doi/10.1073/pnas.2206625119)). Sparse linear probes on the network's activations find
  many human concepts. They emerge during self-play, several around the same period.
- **Schut, Tomašev, McGrath, Hassabis, Paquet, Kim, "Bridging the human–AI knowledge gap through concept discovery and
  transfer in AlphaZero", PNAS 2025** ([arXiv 2310.16410](https://arxiv.org/abs/2310.16410)).
  - **Finding concepts:** each is a sparse direction in a layer's activations, found by convex optimisation. It
    contrasts the search's chosen line with worse lines the same search considered.
  - **Teachability filter:** a weaker checkpoint (the "student") must learn the concept faster from its example
    positions than from random ones. This removed 97.6% of candidates.
  - **Novelty filter:** a concept must be better reconstructed from the engine's own games than from human games.
  - **Examples:** the positions scoring highest on a concept (top 2.5%) serve as its examples.
  - **Result:** four grandmasters improved on held-out example positions.
- **Bastani, Pu, Solar-Lezama, "Verifiable Reinforcement Learning via Policy Extraction" (VIPER), NeurIPS 2018**
  ([arXiv 1805.08328](https://arxiv.org/abs/1805.08328)). A decision tree imitates a network's policy (DAgger with
  CART).
  - **The key:** each state is weighted by how much the choice matters there: V(s) − min over actions of Q(s, a).
  - **The result:** trees an order of magnitude smaller than unweighted imitation (769 nodes against 7,967 for
    perfect Pong), because accuracy goes where it matters.
  - The final tree is the best of all iterations on held-out data.
- **Hebbar, Sheng, Oh, Viswanath, "Hallucinations on the Board", arXiv 2026-08** (preprint,
  [2608.04240](https://arxiv.org/abs/2608.04240)). Without tools, GPT-5.4 gets 22% of its chess commentary sub-claims
  wrong, and smaller open models over 40%. Engine and board tools cut the errors substantially. Expert ideas remain
  poorly covered.

## 2. Design principles for Enclosure, each from a source

1. **Measure loss in a way that does not saturate once a game is decided.** Tried with a human's win chance read from
   the engine's lead (principle 2), and set aside: the labels read the engine's own win chance, which saturates, as
   chess.com's and Lichess's do (design 10). A label then tells what a move cost the result. Points lost alone flagged
   the moves of decided games, so they show in the notes and do not label.
   - **Win chance saturates:** our own review of two lost games found every candidate at a value of −0.97
     ([`v1/docs/decisions/analysis.md`](https://github.com/abstractclass-org/engines/blob/main/v1/docs/decisions/analysis.md),
     "Two lost games reviewed"). KaTrain uses points lost for exactly this reason, and Regan & Haworth rescale errors
     and skip lopsided positions.
   - **Our points measure:** net1's projected final margin (current margin plus ownership × turn ends left). Its
     calibration: slope 1.02. Correlation with the final margin 0.58 over edges 1–39, 0.93 over 40–79, 0.99 over
     80–119 (the same file, "Does net1 know the score?").
   - **So:** points lost is reliable from mid-game on. In the opening, fall back to win chance, and show the
     uncertainty.
   - **V2:** KataGo's score outputs are the proper basis once V2 plays. What each output means is in the engine
     repository's
     [`docs/design/04-notation-and-protocol.md`](https://github.com/abstractclass-org/engines/blob/main/docs/design/04-notation-and-protocol.md).
2. **Convert value to a human win chance, fitted on our archive.** This follows Lichess PR #11148 (logistic fit of
   result on eval), whose author measured the constant falling from −0.0038 for strong players to −0.002 for weak
   ones.
   - **Tried, not kept** (design 10, Alternatives): σ(k · lead / spread) from the engine's lead and its spread,
     k = 0.99, one curve for every rating, fitted on the archive's games between near-equal players. The archive's
     players are beginners of a young game, so the curve is lenient and drifts as they improve. The engine's own
     chance measured strength as well on games of known strength.
3. **Fit to our data what depends on the game. Copy none.** KaTrain's 0.5–12 points are Go numbers, and an engine's
   win chance is a game between engines.
   - What is fitted: nothing, for the labels. The bands on the engine's win chance are chess.com's (0.02, 0.05, 0.10,
     0.20), the same for every player, as no site changes its bands by rating, and they were tested on games of known
     strength. Bands from the percentiles of strong and weak players' losses would grade a move against other players
     of its rating.
   - Record the method, per our rule that every constant is sourced.
4. **Position difficulty is a first-class quantity.**
   - **Per position:** KaTrain's complexity (the prior-weighted loss over candidates). Guid & Bratko for its theory.
     Built in the engine's win chance, with ◆ on hard positions (design 14).
   - **Accuracy:** weight moves by it, so easy positions count less. Built with KaTrain's weights (design 14).
   - **Puzzles:** use it to choose them.
   - **Human side:** weight by the human policy (principle 5) as well as the engine's. A move a 1400 player would
     never consider is not a "trap" for them.
5. **A human model conditioned on rating**, for "what would a player of rating X play here", and later for
   predicting blunders.
   - **Sources:** Maia and Maia-2 (the rating as an input, no search). KataGo's human model already in the fork
     (metadata input, `humanPolicy`).
   - **Our assets:** net1 has a human-policy head (trained on human games, no rating input), and the archive holds
     rated games.
   - **The step:** add both ratings as inputs, as `SGFMetadata` does.
6. **Skill estimate from moves:** fit Regan & Haworth's (s, c) per rating band on the archive. It gives a performance
   rating per game, and a check on whether our loss measure tracks skill at all: the fitted s must fall smoothly with
   rating.
7. **Puzzles by Lichess's rules:**
   - **Where they come from:** positions right after a human blunder in the archive.
   - **Uniqueness:** each solution edge must beat the second-best by a large margin (the analogue of 0.7 winning
     chances, in the human win chance of principle 2).
   - **Rating:** Glicko-2 from solvers' attempts once people use them. Predicted difficulty (BigData Cup) until then.
   - **Two edges a turn:** the solver plays one edge at a time, and each solution edge must be the only good one.
     So uniqueness, not the turn, sets a puzzle's length:
     - **One edge:** the first edge is the only good one, and several second edges are good. The puzzle ends at the
       turn's middle, and then shows the good second edges, so that the turn ends on the board.
     - **The pair:** both edges are the only good ones: set up, then close. The same two edges in the other order are
       accepted when both orders are legal.
     - **Finish the turn:** the puzzle starts at a turn's middle, and only the closing edge is good. A turn whose first
       edge was good and whose second was a blunder gives such a puzzle.
     - **The second-best, for a first edge,** is the best other turn, found as the review finds it for Great (design
       05): the edges of the solution's own turn are left out, because the best turn that starts with one of them is
       often the solution in the other order.
8. **Tags as rules on the solution line, as Lichess's `cook.py` does, each from an exact engine fact.**
   - **The facts:** what the engine's rules and searches give exactly. An edge closes a region, cuts an enemy edge, or
     sets up a region that the next turn closes. The area at stake: the ownership that a move keeps or gives away
     (design 30). Each tag is a predicate on these facts, tested on the solution line, not on the mistake.
   - **Not the community's terms.** The players' document ("Enclosure Tech & Strategy Documentation", a Google Doc)
     names structures of 3-4 edges: guards, spear, needle, shield, and others. Its own note says that the wording is
     still loose, its definitions are in its pictures, and no engine fact checks them. Tags built on it could be noise:
     a name that a player reads as exact when it is not. So the tags rest on the engine's facts alone. A term of the
     players can name a tag later, if strong players agree that it means the same predicate.
   - **Our own motif list** (enclose, set-up-and-close, double threat, cut, deny, timing of invincible edges,
     sacrifice, reach and wall) gives the first predicates. Strong players review each tag before it ships, since the
     tool is also for top players.

   Size tags come from the points lost. Phase tags from the edge number.
9. **Rules of thumb by weighted distillation (VIPER).** Fit a small model to the engine's choices over readable move
   features: `enclosure/features.py`'s features, or a shallow tree on them. Weight each position by how much the
   choice matters (VIPER's V − min Q).
   - **Worth for a person:** the arena rating of the distilled player, its agreement with the engine where it
     matters, and whether the rules read as sensible.
   - `tools/fit_ranker.py` already fits a linear ranker to *human* moves. The change: fit to the engine, with VIPER's
     weights.
10. **Concepts from the network: the main bet.** McGrath et al. and Schut et al. are the core of the tool, not an
    add-on.
    - **Known concepts first (McGrath):** probe the network's activations for the engine facts of the tags (principle
      8) and for our own quantities (reach, held ground, a region closable next turn). Which does the
      network encode, at which layer, and from which training step? A concept the network encodes but players don't
      name is the next principle's target.
    - **New concepts (Schut):** contrast the search's chosen line with worse lines it considered, and solve for sparse
      concept vectors.
      - Keep a concept only if a weaker checkpoint learns it from examples faster than from random positions
        (teachability, we have every checkpoint of net1, net1b and V2).
      - Keep it only if the engine's games explain it better than human games do (novelty, the human games are our
        5,648 archived meaf.us games).
      - Its top-scoring positions become puzzles, for top players too.
    - **Naming:** compare each discovered concept with the tags' engine facts. A concept close to a tag gets its name.
      The rest are described by their example positions and the engine facts they share, and a strong player names
      them. The community's terms are not the base (principle 8).
11. **Any text explanation is built from engine facts.** Given the 22% error rate without tools (Hebbar et al.),
    words come from checked facts: tags, points, lines, and the engine's ownership. Free-form language model
    commentary, if ever, calls the engine as a tool.
    - **The area map** (design 30) is such an explanation. A move's label says what it cost, and its line says what
      was better. The map shows the engine's ownership of each point, or its change from the board now, and while a
      candidate's line shows, the ownership after that candidate. Its legend and the numbers of the point under the
      pointer state the engine's values, with no language model. A caption that read a mistake from the opponent's
      next turn was built and removed: one turn's close or cut is not what the mistake gave away.

## 3. What Enclosure changes

- **Two edges a turn.** Moves within a turn are not independent: a good first edge may only pay off with the second.
  Report per edge and per turn, and let the tags see the pair.
- **Scores are paid every turn end.** A delay costs points every turn (the missed +126 cost about 250), so "points
  lost" includes tempo naturally when measured on the projected final margin.
- **The truth is only as good as the engine.** Regan & Haworth need an engine far above the players. V1's online bot
  (net1-370) won 77 of its first 84 games on meaf.us (`runs/online-ACCOUNT.log`), but its mid-game judgment was the
  weak point in the reviewed losses.
  - Use the strongest model at a large budget.
  - The labels do not measure the search's noise (the same position searched twice): section 4 drops that check.
- **The search must report every candidate.** KaTrain and Regan use per-candidate values (multi-line analysis). The
  engine's analysis entry point must give each root child's visits, value, score and prior. The request for it is
  [requests/02-engine-protocol.md](../requests/02-engine-protocol.md).

## 4. The first milestone

**Milestone 1, the game report:** the review of a player's own game, in the player's browser: per-candidate
statistics (section 3), points lost and labels by turn or by edge ([design 10](10-labels.md)), complexity and hard
positions ([design 14](14-complexity.md)), accuracy, the report, and export and import. It is live. Its cost in the
browser is measured in [decisions/engine.md](../decisions/engine.md).

**Not part of it (2026-10-20):**
- **Archive statistics:** points lost by rating band and game phase, and a fitted rating-conditioned win curve
  (principle 2). Few people play Enclosure, so statistics of their games are not worth the work. The labels fit
  nothing to people ([design 10](10-labels.md)).
- **The checks planned with them:** points lost against rating, the noise floor (the same position searched twice),
  the label budget against a deeper reference, and which score measures points lost. They add little to the review
  of a player's own game.
- **An export from meaf.us:** the site asks meaf.us for nothing.

**Later milestones, each on its own:** tags (principle 8). Puzzles (principle 7). A rating-conditioned human policy
(principle 5). Distilled rules (principle 9). Concepts (principle 10).

## 5. The answers, and when to build

- **Priority:** in the engine repository, training a strong bot comes first. This repository uses the engine that
  exists and asks for changes through requests ([requests/](../requests/README.md)).
- **Audience:** Enclosure players who want to improve, top players included.
- **Tags:** from exact engine facts (principle 8), not from the community's terms. The tool counts mostly on McGrath's
  and Schut's methods (principle 10).
- **Engine and timing:** the tool was to come after V2, because most features depend on V2 or are much cheaper on
  it. V2 now plays, and it runs in the browser as one WebAssembly module, so the work starts. The check:

  | Feature | On net1 / net1b | On V2 (the KataGo fork) |
  |---|---|---|
  | Every candidate's statistics (section 3) | needs a native addition to `PlaySearch` | the analysis engine's `moveInfos` (visits, win rate, score, prior, line, per-move ownership), already handling Enclosure ([`katagame/ENCLOSURE.md`](https://github.com/abstractclass-org/KataGame/blob/main/ENCLOSURE.md)). The WebAssembly module does not expose it yet. |
  | Points lost (principle 1) | the ownership projection. Weak in the opening (correlation 0.58) | the score outputs (`scoreSelfplay`, `scoreLead`) |
  | A human model by rating (principle 5) | a human-policy head without rating input. Retraining needed | KataGo's human-model machinery with rating inputs (`SGFMetadata`, `humanPolicy`) |
  | Concepts (principle 10) | possible on any network | best on the strongest network, which should be V2. Its analysis lines give the chosen and worse lines Schut contrasts |
  | Tags, puzzles, skill fit, win curve (principles 2, 3, 6–8) | engine-agnostic, but built on the loss measure above | same |

- **Before then, for free:** the tags' engine facts (principle 8) are CPU-only engine code. The ones that read the
  rules belong in the engine repository. Nothing is scheduled.
