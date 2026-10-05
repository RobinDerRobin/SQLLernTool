# Kritiker, Runde 1: Kritik an Runde 1 des Designers

> Bericht eines Agenten (Rolle siehe Titel), 05.10.2026, Wortlaut unverändert (Englisch).
> Index und Kontext: [README.md](README.md). Entscheidungen von Robin stehen in `docs/PROTOTYPEN.md`, nicht hier.

---

## 1. Verdict
The core move is right and fits Robin: every stage is flown horizontally with the floor down, a turnaround flips the dachshund instead of rotating the screen, N/S map onto left/right, and there is no zoom. But the proposal misreads how v0.2 works, leans on precedents that support the option it rejects, and understates how often Kompass-Seite flips the screen. It also contradicts Robin on forks and on mirroring, and its prototype is too big yet still cannot tell its two main concepts apart.

## 2. Contradictions with Robin
- **Forks.** Robin: "Arenas aren't the only way to move between stages or to take a fork." F: "every direction decision happens north-up (arenas, fork halt zones, a turn overlay)." A top-down halt zone is a mini-arena, which is the Weichenraum from WELT-DESIGN 2.6 again.
- **Mirroring.** Robin: "diagonal stages shouldn't necessarily be visually flipped" and "furniture [does] not change." C: "stages must be horizontally mirrorable… same stage may appear mirrored." Pure A has the same problem on every backtrack, and the proposal does not say so.
- **Who rotates.** Robin: "the world rotates around the player… you keep flying." In Kompass-Seite the world is pinned to the screen and the dachshund turns around. That happens on 8 of the 16 possible 90° turns and on 4 of the 16 possible 45° turns (N↔NW, S↔SE). "Some" understates it.
- **Gravity.** Robin: "Gravity, currents, winds… do not change." The proposal counts as a pro that "Kühlschrank cold air S = suction always flows left." But the cold air *falls* (WELT-DESIGN 2.7 #11). Drawing it as a sideways current is gravity changing.
- **Scope.** Robin: "small prototypes, one concept at a time; no level design." The proposal bundles 3 side rules, the swing, a compass, a minimap, 2 HUD layouts, a canvas change, 5 arenas, a ring, a NE exit, waves, a current, a hazard and a sign.

## 3. Wrong or shaky claims
- **v0.2 Wendehals does not put the floor on top.** `Level.reverse()` (`level.js:679`) mirrors the map on both axes and flips the heading, so on screen the world stays where it is. Only the dog spins (`viewAngle`: "Die Welt bleibt bei der 180°-Kehrtwende stehen").
  - The floor is on top only when you launch flying W or fly an edge backward (`levelgen.js:233` `mirroredA()` plus the 180° view; `renderer.js:289`).
  - So v0.2 contradicts itself: the same stage is upright after a mid-stage turn and upside-down when you re-enter it from the east.
  - Consequence: Kompass-Seite for E/W is almost free. Launch backward flights with the same transform `reverse()` already uses.
- **The 44 % figure** is arithmetically right (1 − 270/480), but N/S stages today keep the full 480 units of preview through zoom. What they lose is scale: sprites shrink to 0.5625 linear, about 32 % of their area. That is Robin's "zoomed out weirdly." D1's 0.56× scroll only fixes the warning time for terrain; enemies and bullets entering from the top still give 44 % less warning.
- **Steam Deck:** correct. `fit = min(2.667, 2.963)` gives 1280×720, shown as two 40 px bars. But "480×300" would change `SCREEN_H`, which feeds `viewDims`, `localToScreen`, `crossPeriod` (288) and the v0.2 golden master. It has to be a separate HUD band, and a 16:9 PC then needs a second HUD layout.
- **Precedents:**
  - Gradius V: the ship does face right while stages alternate horizontal/vertical scrolling and one even scrolls backward. But it is 4:3 and the ship never faces left, so it supports D3, not compass-bound screen sides.
  - Darius and Super Hydorah use abstract branching maps and always fly right, which supports pure A.
  - Defender and Fantasy Zone are looping fields you fly in either direction; neither has an authored forward stage.
  - The precedent Kompass-Seite actually needs is missing: side-view metroidvanias such as Super Metroid and Dread cross every room both ways, never mirror it, and keep west on screen-left.
  - Jamestown is considered the rare success of vertical scrolling on 16:9, not an "acquired taste."
  - Thunder Force IV's camera follows the ship, not rising terrain.
- **"Pure A is simpler"** is false. Always flying right means every backtrack is mirrored, and a mid-stage Wendehals has to break the rule.
- **"~90 % shared" hides that the switch tests almost nothing.** Leaving a north-up arena, Schwenk's smallest rotation puts E/NE/SE on the right and W/SW/NW on the left, exactly like Kompass-Seite. Only N and S are ties. Without forks, the two rules differ on two exits.

## 4. Underrated risks
- **Held stick through a launch.** Leave an arena north while holding up, and the stage starts with "up" meaning the ceiling. Terrain kills instantly, so every swing needs the stick re-centred or a grace period.
- **Conflicting motion cues.** On an N stage the minimap dot moves up while you fly right.
- **Button clash.** B is Power (`input.js`, `1:'power'`) and the same thumb holds A for fire, so "hold B" collides. L1 is unmapped.
- **In-stage overlay.** It either freezes time, which is a pause exploit, or takes the stick away while you dodge.
- **G with 8 headings.** An E stage can branch to NE, N, SE or S; upper/lower covers only two. On N/S stages flown horizontally, "upper = counter-clockwise" makes "up" mean west or east, which is arbitrary.
- **The compass becomes cosmetic**, the very problem the proposal names in its section 1.
  - welt.json has 38 vertical and 17 diagonal stages out of 97.
  - Each area's identity built on its dominant flight direction (Kühlschrank vertical, Kinderzimmer diagonal) collapses to a HUD letter.
  - The Wasserwaage's 10 newly opened locks are never felt in play.
- **Schwenk breaks handedness.** In the Uhrwerk-Himmel, ratchets that turn "only clockwise", clock faces and ring arrows would all run the wrong way when mirrored. Schwenk's orientation state must also survive saving, death and respawn.
- **Authoring cost.** Hand-built waves (Phase 5) are needed per flight direction.
- **Solver.** "Wrong orientation" shrinks to "flown backward." With Wendehals usable anywhere, each edge needs a "fair when flown backward" flag; `appliesTo` exists only for hazards.
- **Docs first.** WELT-DESIGN 2.2, PLAN Phase 2 / E1 and the stage types in welt.json must be rewritten before building (CLAUDE.md: no design decisions outside the docs).

## 5. What's overbuilt, and the minimal prototype
Cut from the proposal's prototype:
- the third side rule (without bends Schwenk looks the same)
- the HUD-placement switch and the canvas change
- the minimap (Phase 7)
- the new hub and end arenas
- the NE exit (diagonals still throw in `math.js`)
- the current, the hazard, the sign and the waves

Minimal prototype: a switch `?seite=karte|rechts` on the **existing v0.2 world**. Every stage is horizontal with the floor down.
- `karte`: W edges and backward flights go left using the `reverse()` transform. N edges are built with the horizontal profile and fly right; S edges fly left.
- `rechts`: always fly right; backtracks are mirrored.

This needs no new content, and Robin can play 32 stages he already knows on the Deck.

The single question it must answer: **should the screen side follow the map or the dachshund?** Only if "map" wins, prototype 2 adds one forced 90° bend inside a stage (stop, swing, keep flying).

## 6. Missing alternatives
- **Group rule.** Right group = {E, NE, SE, N}, left group = {W, SW, S, NW}. Mid-stage forks may only branch within a group, so you keep flying, nothing is mirrored and the map side stays true. Switching sides happens only in arenas or via Wendehals. This is one solver check. The cost is asymmetry: from E, only N/NE/SE branches are possible.
- **Edge strip HUD.** During a stage, show the current edge as a horizontal bar that matches the screen direction, with compass letters and arena icons at its ends, instead of a dot on a 2D map.
- **Darius-style tunnel mouths.** You choose a branch by flying into a labelled mouth, and the needed turn ability opens it. No pre-selection, no overlay, no extra button.
- **Floor-plan map with floors as layers**, connected by stairwell or lift arenas. Every corridor is then genuinely horizontal, and the Kühlschrank's cold air becomes a downdraft across the flight axis.

## 7. Questions Robin must answer first
1. Does the screen side follow the map (west = left, never mirrored) or the dachshund (keeps its direction, stages may appear mirrored)?
2. Is the map a floor plan or a cross-section of the house, i.e. does N mean "up the house"?
3. May a mid-stage turn reverse your screen direction, or should forks only branch where you keep flying (group rule)?
4. How do you choose a fork: by flying into a labelled mouth, or by a turn button (which one, given B is Power)?
5. With everything horizontal, what should make N, S and diagonal stages, and areas like the Kühlschrank, feel different?

### Critical Files for Implementation
- /home/user/SQLLernTool/wendehals/src/game/levelgen.js
- /home/user/SQLLernTool/wendehals/src/game/level.js
- /home/user/SQLLernTool/wendehals/src/core/math.js
- /home/user/SQLLernTool/wendehals/src/render/renderer.js
- /home/user/SQLLernTool/wendehals/docs/WELT-DESIGN.md

Sources: [Gradius V (lparchive)](https://lparchive.org/Gradius-V/), [Gradius V (Wikipedia)](https://en.wikipedia.org/wiki/Gradius_V), [Jamestown (Shmups Wiki)](https://www.shmups.wiki/library/Jamestown), [Vertical shmups on 16:9 (system11)](https://shmups.system11.org/viewtopic.php?f=1&t=57910), [Super Hydorah review (Nintendo Life)](https://www.nintendolife.com/reviews/switch-eshop/super_hydorah), [Fantasy Zone (StrategyWiki)](https://strategywiki.org/wiki/Fantasy_Zone)
