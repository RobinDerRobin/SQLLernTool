# Game-Designer: Bewertung von Robins Skizze (Fenster-Konzept)

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

# Robin's sketch: the screen as a rotating window on the world map

## 1. Reading of the sketch

Your reading is correct. Left group: clockwise 90° puts L at the top and R at the bottom; clockwise 45° puts L top-left and R bottom-right. Right group: counter-clockwise 90° puts R at the top; counter-clockwise 45° puts L bottom-left and R top-right. The boxes are the screen drawn onto a north-up map.

I'd add one thing you didn't mention. If the map is rigid, the second way of showing a corridor is the first one rotated 180°. So a side-view stage would appear upside down (see section 2).

**Rules**
- **State:** (position, θ, s, items).
  - θ (8 values) is the map direction the screen's R end points to.
  - s ∈ {R, L} is the flight direction on screen.
  - The heading on the map is h = θ when flying right (s = R) and θ + 180° when flying left (s = L).
- **Display:** the map is drawn rotated by −θ around the dog. The play axis is always horizontal, zoom is always 1, and you always see 480 units ahead, diagonals included.
- **Rotate right:** θ moves clockwise by 45° or 90°, and s stays the same. The heading turns clockwise in both flight directions, which is always the dog's own right. On screen the world swings counter-clockwise and the dog keeps flying the same way. Rotate left is the mirror image.
- **Flying right/left:** flying right moves toward θ on the map, flying left toward θ + 180°.
- **Flip:** s toggles, so the heading changes by 180° without any world swing. This is Robin's "flying back needs no rotation".
- **Two ways to show a corridor:** a corridor with axis φ appears whenever θ is φ or φ + 180°, and which one you get depends on your rotation history.
  - Example: a N–S corridor reached heading E, then rotate left 90° → θ = N, north end on the right.
  - Reached flying right while heading W, then rotate left 90° → θ = S, north end on the left.
- **Arenas and junctions** (the sketch doesn't cover them; this is my proposal): they are places on the same map, seen through the window. Exits open in the heading direction, and you rotate only where corridors branch.
- **Overlay:** a north-up minimap with the strip drawn at θ, L blue, R red, and an arrow on the flight end. This is literally the sketch.

## 2. Evaluation

**Strengths**
- It meets all of Robin's constraints at once:
  - The screen stays straight, play stays horizontal, and the zoom-out is gone.
  - Right-to-left flight is built in.
  - The world is rigid: nothing changes, only the window moves.
  - Forks are real geometry, and each strip keeps its own tile grid.
  - E1 (how to show diagonal stages) becomes obsolete.
- Turn buttons are unambiguous: "rotate right" always means clockwise on the map and the dog's own right, whichever way he flies.
- Play that turns with you plus a north-up overlay matches navigation research [belegt]. Maps that turn with the traveller are better for route following and naming directions; north-up maps are better for building a mental map. That research is about "track-up" (rotating) vs. "north-up" (fixed) map displays.
- It fits the engine. `Level.viewAngle()` already returns `headingAngle(heading)`, and `drawLevel` already rotates by it. The concept is `headingAngle(h) − θ`; today's game is the special case θ = E.

**Weaknesses and risks**
- **Floor and ceiling.** In the θ + 180° view, a stage appears upside down, as v0.2's W stages do today. With side-view art (furniture standing on a floor) that contradicts "gravity doesn't change". The concept is only consistent if stages read top-down: a corridor with two banks and no "up". Arenas are already top-down, so this would unify the world. Major decision.
- **Orientation.** The same place looks rotated on another visit. Landmarks must read at any angle, text must not rotate, and the overlay has to do real work [geschätzt].
- **Arenas.** A 480×270 room rotated by 45° or 90° doesn't fit the screen. Arenas would become octagons about 270 across, with one wall face per compass direction. That fits the 8 headings well.
- **Rotating mid-corridor.** On a rigid map, rotating where there's no branch faces you into a wall. So rotations happen only at junctions, Weichen and Seitenklappen, as in WELT-DESIGN 2.6d. Elsewhere the dog shakes his head.
- **Controls.**
  - LB/RB rotate: tap = 45°, hold = 90°.
  - The stick moves the dog within the screen. The dog faces and fires along s, using the existing `playerSpin`.
  - If s is freely flippable, as in Defender or Fantasy Zone [belegt], the autoscroll becomes player-driven. The Wendehals and the Rückschalter puzzles lose their meaning, and the direction resource shrinks to 4 axes.
- **The swing.** A full-screen rotation is 0.4–0.8 s of frozen time. It needs easing and a "reduced effects" option [geschätzt].
- **Solver.** Which way a corridor is shown is cosmetic, because enemies live in world coordinates. The state stays (node, h, items) if flipping is gated; θ never enters the solver.
- **Precedent:** Gradius V's stages rotate and move while the ship keeps facing right [belegt].

## 3. Changes to the direction model

- **Heading stays the rule variable.** h = θ when flying right (s = R), θ + 180° when flying left (s = L). `worldgraph3` and the solver are unchanged; θ and s only decide how things are shown. *Decide:* the θ after respawn or loading (proposal: θ = h, flying right).
- **Turn abilities rotate θ.**
  - Drehwurm: ±90° at Kreisel.
  - Wasserwaage: ±45°.
  - Kreiselkompass: anywhere in arenas.
  - Wirbelwind: at Seitenklappen.
  - Rings turn you clockwise or counter-clockwise by the direction you fly through them. The parity rule and the turn charge are unchanged.
- **Wendehals = flip s.** *Decide between:*
  - (a) Flipping only at stations and Wender at first, anywhere once you have the Wendehals. This keeps the progression and the puzzles, and it's my recommendation.
  - (b) Flipping is free. The Wendehals becomes obsolete and needs a new meaning.
- ***Decide:*** may a player rotate the window 180° (θ + 180°, s flipped) to get the other view of the same heading, for example to put the floor down?
- ***Decide:*** does "wrong orientation" mean flying against the stage's designed direction (solver-friendly, my recommendation), or flying it in the upside-down view?
- **`viewDims`:** zoom 1 for every heading.

## 4. Smallest prototype: "Fenster" (`?welt=proto`)

**Map:** a square loop with one diagonal.
- **H:** octagonal hub arena at the bottom-left, with exits N, E and NE.
- **K:** junction east of H. It is a real fork: north to X, or east to a short dead end with a Wender.
- **X:** junction north of K.
- **Y:** junction west of X and north of H.
- **Corridors** (about 30–40 s each): H–K (E), K–X (N), X–Y (W), Y–H (S), and the diagonal H–X (NE).

Flying the loop counter-clockwise with left rotations keeps you flying right throughout. Flying it clockwise with right rotations brings you back to H with θ = W, so the H–K corridor shows its other, upside-down view. One loop shows both views, 90° and 45° turns, the fork and the diagonal.

**Content:** reuse a `levelgen` profile without wrap (H = 288) as two banks. Add light existing enemy waves, one current with a fixed map direction on Y–H, and one text sign plus one clock as rotation-readability checks.

**Controls**
- Stick: move.
- A: fire.
- LB/RB: rotate. Only at K, X, Y and in H; elsewhere head shake.
- Y: flip, using `Level.reverse()` and `turnAnim`/`playerSpin`.
- Select: full map.

**Display:** a 0.5 s swing (`viewAngle` tweened from the old to the new angle, simulation frozen), a north-up minimap with the L/R strip and a flight arrow, and a north marker at the screen edge.

**Toggles:**
- Upside-down view: rigid rotation vs. mirrored with the floor down.
- Flip: free vs. only at nodes.
- Overlay: corner vs. Deck bar.

**Engine work**
- `viewAngle` subtracts θ.
- `viewDims` returns zoom 1.
- Arena is rendered rotated, with octagon walls.
- `drawLevel`'s existing rotate is reused.

**Not in it:** abilities and progression, turn charge, `worldgraph3`/solver changes, `welt.json`, bosses, level design, vertical stages, save format, new art beyond the two banks.

## 5. Questions for Robin after playing

1. After one loop, can you point to H on the minimap without looking? Did the upside-down second pass along H–K confuse you?
2. Rigid rotation or mirrored with the floor down: may a stage appear upside down, or should stages become top-down corridors?
3. Should flipping be free (Defender-style) or a gated move (Wendehals)?
4. Do LB/RB (tap = 45°, hold = 90°) and the 0.5 s swing feel right? Any discomfort?
5. Should arenas rotate with the window (octagon), or snap to north-up?

**Sources:**
- [Track-up vs. north-up](https://www.researchgate.net/publication/274978969_Performance_Differences_in_a_Navigation_Task_among_Users_Presented_with_a_North-Up_versus_Track-Up_Orientation_Map_Display)
- [Rodes & Gugerty 2012](https://doi.org/10.1177/0018720812439413)
- [Gradius V](https://www.gamespot.com/reviews/gradius-v-review/1900-6107370/)
- [Defender](https://en.wikipedia.org/wiki/Defender_(1981_video_game))
- [Fantasy Zone](https://en.wikipedia.org/wiki/Fantasy_Zone)

### Critical Files for Implementation
- `/home/user/SQLLernTool/wendehals/src/game/level.js`: `viewAngle()`, `reverse()`, `turnAnim`, camera
- `/home/user/SQLLernTool/wendehals/src/render/renderer.js`: `drawLevel` rotation, the `upright` hack, overlay
- `/home/user/SQLLernTool/wendehals/src/core/math.js`: `viewDims`, `headingAngle`, `localToScreen`
- `/home/user/SQLLernTool/wendehals/src/game/arena.js`: rotated octagon arena, `shipAngle`
- `/home/user/SQLLernTool/wendehals/src/game/levelgen.js`: two-bank corridor profile
