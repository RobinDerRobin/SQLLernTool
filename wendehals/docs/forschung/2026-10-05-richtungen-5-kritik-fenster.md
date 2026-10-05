# Kritiker: Prüfung des Prototyps „Fenster“ gegen Skizze und Code

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

**Design critique: the "Fenster" (window) proposal**

**1. Verdict**

The designer reads the sketch correctly. θ is the map direction of the R end and s is L or R. A clockwise window turn is the dog's right turn in both flight directions, 180° only toggles s, and a north-up overlay with a blue L end and a red R end is the sketch itself. The model of node, h and items, with θ for display only, holds up and leaves the solver unchanged. But the prototype still tests about six things, reopens questions Robin has closed, and underestimates the engine work: the formula is right, but the hard part (junctions) does not exist in the engine.

**2. Where the proposal conflicts with Robin; cut these**
- **"Rigid vs mirrored" toggle:** answer 2 (floor plan) settles it: rigid. Mirroring swaps left and right on the map, so a left branch would show on the right, and the world would change.
- **"Is the upside-down second pass confusing?":** a floor plan has no upside-down, only "rotated 180°". Fold this into the key question as "do you recognise a corridor you revisit?".
- **"Flip free vs gated" and the Wender dead end:** answer 3 is already in the game. `level.js:248–251` says the world stays and only the dog turns; `reverse()` and `playerSpin()` do it. Gating belongs to the existing turn-ability ladder (Wendehals at about 40 %), not to this concept. In the prototype the flip is free on Y.
- **"May the player rotate 180° for the other view?":** contradicts answer 3, because a 180° turn never rotates the window.
- **"Arenas rotate or snap north-up?":** snapping would rotate the window without a turn, which contradicts the sketch. Arenas rotate; their shape is still open (see 5).
- **Overlay corner vs Deck bar, and the north marker:** put the overlay in a corner. A second north cue would muddy the overlay test.
- **LB/RB with tap 45° / hold 90°:** the branch shape already fixes the angle. Buttons tied to the dog's left and right also swap on screen: flying right, the upper branch is LB; flying left, it is RB. RB (pad button 5) is already Espresso (`input.js` PADMAP).

**3. Technical reality check**
- **The formula:** `headingAngle(h) − θ` is correct but trivial. Inside a stage, h − θ is always 0° or 180°. Call that `view`: E when flying right, W when flying left.
- **Eight places read `heading`, not one:** `viewAngle` is only one of eight view sites. All of them must use `view`, or N/S and diagonal stages break:
  - `level.js:75` `crossPeriod` gives N/S stages 960.
  - `level.js:76` `viewDims` gives N/S stages zoom 0.5625, which is the forbidden zoom-out.
  - `level.js:532` `screenToLocalVec`: with h = N and θ = N, pushing the stick right moves the dog down.
  - `level.js:579` `margins()`.
  - `renderer.js:291` the `upright` hack draws the dog upside-down when h = W and it is flying right.
  - `renderer.js:422` the background quarter turn rotates the tile 270° for h = N while the view itself is not rotated.
  - `renderer.js:945` darkness outlines.
- **Diagonals:** once these use `view`, diagonals never reach the error branches in `math.js`. The diagonal view work in plan phase 2 shrinks to this change. The v0.2 game keeps `view = heading`, so the golden master stays green.
- **`reverse()`:** needs no change. It mirrors the stage frame and sets h to the opposite, so `view` swaps E↔W and the world stays put.
- **What breaks at 45° and 90° is the junction, not the stage.** A Level is one strip with no position on the map:
  - It cannot show the branch beyond an opening in the bank, or the old corridor during the swing.
  - `drawTerrain` only draws this strip's 18 rows (rows outside are skipped when there is no wrap). During a swing, everything beyond the banks is empty background where the floor plan has wall mass or the branch.
  - Wrapped corridors (544) cannot exist on a floor plan.
- **Arenas:** `exitPoint` throws on diagonal sides, exits are only on E/S/W/N, `collide()` assumes a north-up rectangle, and the cached 480×270 base is drawn without rotation. The octagon claim is right: 270 across fits at all eight angles. It holds about 46 % of today's arena area.
- **Input:** the stick stays screen-relative in stages once input uses `view`. Arena input is "screen = world, north up" (`arena.js:152`) and must be rotated by θ. After a swing, a held stick means a different map direction: steer up into an opening, keep holding, and the dog drifts into a bank, where terrain kills (`level.js:541–545`). The held direction should keep its map meaning until released, like the arena's `lockedExit`.
- **Performance:** a floor pattern at 45° uses the slow `fillTiled` path. Measure it with `e2e:perf` on the Steam Deck.

**4. Cut-down prototype**

*Overbuilt:* the hub arena (a separate concept), the Wender dead end, the current, the sign, the clock, enemy waves, three toggles, the full map on Select, and 30–40 s corridors (too few turns per minute). Building it inside Level/`drawLevel` would also need the missing junction drawing and puts the golden master at risk.

*Missing:* landmarks (with identical banks, a revisited corridor cannot be recognised at all), a task, a measurement, how junctions look, and the stick latch.

*Contents:*
- **Scene:** a standalone scene behind `?welt=proto`. Corridors and junctions are polygons in map coordinates, drawn with one camera transform (rotate by −θ) and scrolling along h. Level and Arena are not touched.
- **Map:** a square loop H–K–X–Y with four corridors of about 15 s each, plus the diagonal H–X (about 20 s). Corners are open forks: you can see into the branch, and steering into it starts a 0.5 s swing around the junction with the game frozen.
- **Corridors:** symmetric banks, no enemies, no gates, no wrap.
- **Landmarks:** four asymmetric landmarks fixed on the map, one per corridor.
- **Task:** collect 3 bones and return to H. The shortest route needs at least one left turn, one right turn, the 45° turn, one flip and one revisit in the opposite direction.
- **Flip and overlay:** free flip (the existing Wendehals). Overlay is a north-up minimap in a corner, with the window rectangle at θ, blue L, red R and an arrow at the flight end. Nothing else.
- **Log:** time, wrong turns, and every 60 s a frozen "Where is H?" prompt. The player points the stick and the angle error is recorded.

**The one key question:** with only the rotating window and the overlay, does Robin still know where he is after the turns, the 45° turn, the flip and the opposite-direction revisit? Pass: he points to H within 45°.

**5. Decisions for Robin, by impact**
1. **Floor plan for all content:** no floor or ceiling anchors (tasse, treppe, spinnweben, pendulum, lavaboden), no wrap (7 profiles), and symmetric banks. `levels.js:53` makes the floor thicker because of the power bar, but when flying left that bank is at the top. Accept the rework?
2. **Arena shape:** small octagons about 270 across, or larger rooms with a following camera. This affects all 71 arenas.
3. **Turn input:** steer into the opening (relative to the screen), or shoulder buttons (relative to the dog, which swap when flying left).
4. **Turns over 90°** (for example 135° with Kreiselkompass): flip plus the shortest swing of at most 90°, which matches answer 3, or one full swing.
5. **θ for display only:** the screen side never changes difficulty, so the solver ignores it. After respawn or load, θ = h.

### Critical Files for Implementation
- /home/user/SQLLernTool/wendehals/src/game/level.js
- /home/user/SQLLernTool/wendehals/src/render/renderer.js
- /home/user/SQLLernTool/wendehals/src/core/math.js
- /home/user/SQLLernTool/wendehals/src/game/arena.js
- /home/user/SQLLernTool/wendehals/src/core/input.js
