# Game-Designer: Update mit Robins drei Antworten (Grundriss, 180° = Scroll-Umkehr)

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

# Update: Robin's concept with his three answers built in

## What Robin's answers settle

- **Screen side:** my reading of the sketch stands. The screen is a window lying on the world map at an angle, it rotates with left/right turns, and you fly both left and right.
- **Floor plan seen from above:** a stage seen from above has no "up", so the problem of the 180° view showing a stage upside down disappears. Corridors have two walls instead of a floor and a ceiling, and the world rotates rigidly. The "mirrored, floor stays down" option I proposed earlier is gone. "Gravity doesn't change" is now trivially true, because there is no gravity on screen.
- **180° turn:** it only reverses the scrolling direction. The window does not rotate, and the dachshund visibly turns around in the plane.

**New flags for Robin (the cost of the plan view):**
- WELT-DESIGN 4.2 describes the world as a cross-section of the house ("sky above, volcano below"). That premise no longer holds.
- Gimmicks based on gravity need re-reading as currents or hazards tied to a map direction: cold air falling (S = suction), the lava updraft, icicles that "point down", "falling and climbing" in shafts.
- Side-view art needs to read from above: furniture standing on a floor, toaster platforms, the dog and enemy sprites.

## 1. Rules (now settled)

- **State:** (position, θ, s, items).
  - θ (8 values) is the map direction the screen's R end points to.
  - s ∈ {R, L} is the flight direction on screen.
  - The heading on the map is h = θ when flying right (s = R) and θ + 180° when flying left (s = L).
- **Display:** the floor plan seen from above, rotated by −θ around the dog. The play axis is horizontal, zoom is always 1, and you see 480 units ahead.
- **Rotate right/left:** θ changes by ±45° or ±90° and s stays the same. The heading turns the same way (always the dog's own right or left). The world swings and the dog keeps flying.
- **180° turn:** s flips and the scroll direction reverses. θ and the world stay where they are. The dog spins 180° in the plane, and the camera pans so there is room ahead.
- **A corridor's two views:** a corridor with axis φ appears with θ = φ or θ = φ + 180°, depending on your rotation history. Both are the same floor plan rotated 180°, and both are equally valid.
- **Arenas:** octagonal rooms on the plan, seen through the window. Exits open in the heading direction. You rotate only at junctions and in arenas.
- **Overlay:** a north-up minimap with the strip drawn at θ, L blue, R red, and an arrow on the flight end. This is the sketch itself.

## 2. Evaluation

**Strengths**
- All of Robin's constraints hold:
  - The screen stays straight and play stays horizontal.
  - The vertical zoom-out disappears, diagonals included.
  - You fly both left and right.
  - The world is rigid: nothing changes except the window.
  - Forks are real geometry, and each strip keeps its own tile grid.
- Arenas and stages now share one perspective.
- Play that rotates with you plus a north-up minimap matches navigation research [belegt]. Maps that turn with the traveller ("track-up") are better for following a route and naming directions. Fixed north-up maps are better for building a mental map.
- Turn buttons are unambiguous in both flight directions.
- Precedents [belegt]: Gradius V rotates and moves its stages while the ship keeps facing right; Defender's Reverse button flips the ship and the scroll direction.

**Risks**
- **Art and lore rework.** This is the largest cost. For the prototype I'd draw characters upright relative to the screen, generalising the existing `upright` hack for W stages, while the terrain rotates rigidly.
- **Orientation.** The same corridor looks rotated on another visit. Landmarks must read at any angle, text must not rotate, and the minimap is essential [geschätzt].
- **Rotating only at branches.** Anywhere else the dog would face a wall, so he shakes his head instead (as in WELT-DESIGN 2.6d).
- **Comfort.** A full-screen rotation lasting about 0.5 s needs easing and a "reduced effects" option [geschätzt].
- **Solver.** It stays (node, heading, items), because θ only changes how things are shown.

## 3. Changes to the direction model

- **The heading remains the rule variable**, and θ is new. θ must be saved; after a respawn, θ = h is the proposal.
- **Turn abilities and rings rotate θ.** Drehwurm ±90° at Kreisel, Wasserwaage ±45°, Kreiselkompass anywhere in arenas, Wirbelwind at Seitenklappen. The parity rule and the turn charge are unchanged.
- **Kompassrose:** you pick a heading; θ follows and s stays the same.
- **"Wrong orientation"** means flying a stage against its designed direction.
- **E1 is obsolete.** N/S stages become ordinary corridors, and `viewDims` uses zoom 1 for everything.
- ***Decide:*** Robin defined what the 180° turn is, not when it is allowed.
  - **Free anywhere:** the Wendehals ability becomes obsolete, the Rückschalter puzzles become trivial, and the direction resource shrinks to 4 axes.
  - **Gated as today:** at stations and Wender at first, anywhere once you have the Wendehals (~40 %). This is my recommendation.

## 4. Smallest prototype: "Fenster" (`?welt=proto`)

**Map:** a square loop with one diagonal.
- **H:** octagonal hub arena at the bottom-left, with exits N, E and NE.
- **K:** a fork east of H: north to X, or east to a short dead end with a Wender.
- **X:** junction north of K.
- **Y:** junction west of X and north of H.
- **Corridors** (about 30–40 s each): H–K (E), K–X (N), X–Y (W), Y–H (S), and the diagonal H–X (NE).

Flying the loop counter-clockwise with left rotations keeps you flying right throughout. Flying it clockwise with right rotations returns you to H with θ = W, so H–K appears in its rotated view. One lap shows both views, 90° and 45° turns, a fork and the diagonal.

**Content:**
- A `levelgen` profile without wrap (H = 288), drawn as two walls.
- Light existing enemy waves.
- One current with a fixed map direction on Y–H.
- One text sign and one clock to check readability under rotation.

**Controls**
- Stick: move.
- A: fire in the flight direction.
- LB/RB: rotate, tap = 45°, hold = 90°. Only at K, X, Y and in H; elsewhere head shake.
- Y: 180° turn.
- Select: full map.

**Display:**
- A 0.5 s swing at junctions, with the simulation frozen.
- The minimap with the L/R strip.
- A north marker at the screen edge.

**Toggles:**
- 180° turn: free vs. only at nodes.
- Minimap: corner vs. the Deck's unused bar (on the Deck the game leaves 80 px of the 800 px height empty).

**Engine reuse (small):**
- `Level` gets θ. All screen maths uses the relative heading `rel = rotationSteps(θ, h)`, which is always E or W outside a swing. `viewDims`, `screenToLocalVec`, `localToScreen` and `viewAngle` then run their existing E/W branches, and diagonals never reach the branches that throw an error.
- The map heading is used only for rules, the minimap and the swing.
- The 180° turn is already implemented. `reverse()` turns the level's coordinates 180° while `viewAngle` adds 180°, so the terrain stays still; `playerSpin` and the camera pan animate the dog. The comment in `viewAngle()` already says "the world stays put".
- The swing tweens an extra ±45° or ±90° on `viewAngle`.
- The arena is drawn rotated by −θ with octagon walls, and the stick input is rotated by θ.

**Not in it:** abilities and progression, turn charge, `worldgraph3`/solver changes, `welt.json`, bosses, level design, save format, any art beyond the two corridor walls.

## 5. Questions for Robin after playing

1. After one lap, can you point to H on the minimap? Did the rotated second pass along H–K confuse you?
2. Should the 180° turn be free, or stay the Wendehals ability?
3. Do LB/RB (tap 45°, hold 90°) and the 0.5 s swing feel right? Any discomfort?
4. Should arenas rotate with the window (octagon), or snap to north-up?
5. Does the view from above still feel like Parodius? This decides the art direction.

**Sources:**
- [Track-up vs. north-up](https://www.researchgate.net/publication/274978969_Performance_Differences_in_a_Navigation_Task_among_Users_Presented_with_a_North-Up_versus_Track-Up_Orientation_Map_Display)
- [Rodes & Gugerty 2012](https://doi.org/10.1177/0018720812439413)
- [Gradius V](https://www.gamespot.com/reviews/gradius-v-review/1900-6107370/)
- [Defender](https://en.wikipedia.org/wiki/Defender_(1981_video_game))

### Critical Files for Implementation
- `/home/user/SQLLernTool/wendehals/src/game/level.js`: θ, `viewAngle()`, `reverse()`, `playerSpin`, camera pan
- `/home/user/SQLLernTool/wendehals/src/core/math.js`: `rotationSteps`, `viewDims`, `screenToLocalVec`, `localToScreen`
- `/home/user/SQLLernTool/wendehals/src/render/renderer.js`: `drawLevel` rotation, generalising the `upright` hack, minimap
- `/home/user/SQLLernTool/wendehals/src/game/arena.js`: octagon arena rotated by −θ, stick input rotated by θ
- `/home/user/SQLLernTool/wendehals/src/game/levelgen.js`: corridor profile with two walls
